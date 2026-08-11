package datasource

import (
	"fmt"
	"regexp"
	"strings"
)

var blockedSQLKeywords = map[string]struct{}{
	"alter": {}, "analyze": {}, "begin": {}, "call": {}, "commit": {},
	"copy": {}, "create": {}, "delete": {}, "drop": {}, "export": {},
	"grant": {}, "import": {}, "insert": {}, "load": {}, "merge": {},
	"revoke": {}, "rollback": {}, "set": {}, "truncate": {}, "update": {},
	"vacuum": {},
}

type TableConfig struct {
	Name         string
	TenantColumn string
}

func IsSingleReadOnlyStatement(query string) bool {
	analysis := analyzeSQL(query)
	return analysis.valid &&
		analysis.firstTokenIsIdentifier &&
		(analysis.firstKeyword == "select" || analysis.firstKeyword == "with") &&
		!analysis.hasBlockedKeyword
}

func ContainsIdentifier(query string, identifier string) bool {
	pattern := regexp.MustCompile(`(?i)(^|[^A-Za-z0-9_])` + regexp.QuoteMeta(identifier) + `([^A-Za-z0-9_]|$)`)
	return pattern.MatchString(query)
}

func ReferencedTables(query string, explicitTableNames []string, tables []TableConfig) []string {
	if len(explicitTableNames) > 0 {
		return append([]string(nil), explicitTableNames...)
	}
	searchableQuery := analyzeSQL(query).referenceText
	result := []string{}
	for _, table := range tables {
		if table.Name != "" && ContainsIdentifier(searchableQuery, table.Name) {
			result = append(result, table.Name)
		}
	}
	return result
}

// ValidateReadOnlyQuery enforces the app-runner safety boundary. Table inputs
// are retained for API compatibility; App Store owns table authorization.
func ValidateReadOnlyQuery(query string, explicitTableNames []string, tables []TableConfig) error {
	if strings.TrimSpace(query) == "" {
		return fmt.Errorf("query is required")
	}
	if !IsSingleReadOnlyStatement(query) {
		return fmt.Errorf("query must be a single read-only SELECT statement")
	}
	return nil
}

func QueryWithRowLimit(query string, rowLimit int64) string {
	normalized := strings.TrimSpace(query)
	normalized = strings.TrimSuffix(normalized, ";")
	if rowLimit <= 0 {
		return normalized
	}
	analysis := analyzeSQL(normalized)
	if analysis.withRecursive && analysis.mainQueryStart > 0 {
		return fmt.Sprintf(
			"%sSELECT * FROM (%s) AS datasource_query LIMIT %d",
			normalized[:analysis.mainQueryStart],
			normalized[analysis.mainQueryStart:],
			rowLimit,
		)
	}
	return fmt.Sprintf("SELECT * FROM (%s) AS datasource_query LIMIT %d", normalized, rowLimit)
}

type sqlAnalysis struct {
	valid                  bool
	firstTokenSet          bool
	firstTokenIsIdentifier bool
	firstKeyword           string
	hasBlockedKeyword      bool
	terminated             bool
	referenceText          string
	withRecursive          bool
	mainQueryStart         int
}

// analyzeSQL is a conservative lexer for the datasource safety policy, not a
// full SQL parser. Hash comments are accepted only before the first executable
// token because PostgreSQL also uses # as an operator.
func analyzeSQL(query string) sqlAnalysis {
	analysis := sqlAnalysis{valid: true, mainQueryStart: -1}
	var reference strings.Builder
	parenDepth := 0
	topLevelIdentifiers := 0

	markToken := func(identifier string, isIdentifier bool) {
		if analysis.terminated {
			analysis.valid = false
		}
		if !analysis.firstTokenSet {
			analysis.firstTokenSet = true
			analysis.firstTokenIsIdentifier = isIdentifier
			if isIdentifier {
				analysis.firstKeyword = strings.ToLower(identifier)
			}
		}
		if isIdentifier {
			keyword := strings.ToLower(identifier)
			if _, blocked := blockedSQLKeywords[keyword]; blocked {
				analysis.hasBlockedKeyword = true
			}
		}
	}

	for i := 0; i < len(query); {
		if isSQLWhitespace(query[i]) {
			reference.WriteByte(query[i])
			i++
			continue
		}

		if strings.HasPrefix(query[i:], "--") || query[i] == '#' && !analysis.firstTokenSet {
			if analysis.terminated {
				analysis.valid = false
			}
			reference.WriteByte(' ')
			i = skipSQLLineComment(query, i)
			continue
		}

		if strings.HasPrefix(query[i:], "/*") {
			if analysis.terminated {
				analysis.valid = false
			}
			reference.WriteByte(' ')
			var closed, nested bool
			i, closed, nested = skipSQLBlockComment(query, i)
			if !closed || nested {
				analysis.valid = false
			}
			continue
		}

		if query[i] == '\'' {
			markToken("", false)
			reference.WriteByte(' ')
			var closed bool
			i, closed = skipSQLQuotedValue(query, i, '\'')
			if !closed {
				analysis.valid = false
			}
			continue
		}

		if query[i] == '"' || query[i] == '`' {
			markToken("", false)
			start := i
			var closed bool
			i, closed = skipSQLQuotedValue(query, i, query[i])
			reference.WriteString(query[start:i])
			if !closed {
				analysis.valid = false
			}
			continue
		}

		if query[i] == '$' {
			if delimiter := sqlDollarQuoteDelimiter(query, i); delimiter != "" {
				markToken("", false)
				reference.WriteByte(' ')
				contentStart := i + len(delimiter)
				closingOffset := strings.Index(query[contentStart:], delimiter)
				if closingOffset < 0 {
					analysis.valid = false
					i = len(query)
				} else {
					i = contentStart + closingOffset + len(delimiter)
				}
				continue
			}
		}

		if isSQLIdentifierStart(query[i]) {
			start := i
			i++
			for i < len(query) && isSQLIdentifierPart(query[i]) {
				i++
			}
			identifier := query[start:i]
			if parenDepth == 0 {
				lower := strings.ToLower(identifier)
				if analysis.firstKeyword == "with" && topLevelIdentifiers == 1 && lower == "recursive" {
					analysis.withRecursive = true
				}
				if analysis.withRecursive && lower == "select" && analysis.mainQueryStart < 0 {
					analysis.mainQueryStart = start
				}
				topLevelIdentifiers++
			}
			markToken(identifier, true)
			reference.WriteString(identifier)
			continue
		}

		if query[i] == ';' {
			if !analysis.firstTokenSet || analysis.terminated {
				analysis.valid = false
			}
			analysis.terminated = true
			reference.WriteByte(' ')
			i++
			continue
		}

		if query[i] == '(' {
			parenDepth++
		} else if query[i] == ')' && parenDepth > 0 {
			parenDepth--
		}
		markToken("", false)
		reference.WriteByte(query[i])
		i++
	}

	analysis.referenceText = reference.String()
	return analysis
}

func skipSQLLineComment(query string, start int) int {
	i := start + 1
	if query[start] == '-' {
		i++
	}
	for i < len(query) && query[i] != '\n' && query[i] != '\r' {
		i++
	}
	return i
}

func skipSQLBlockComment(query string, start int) (int, bool, bool) {
	nested := false
	for i := start + 2; i < len(query); {
		if strings.HasPrefix(query[i:], "/*") {
			nested = true
			i += 2
			continue
		}
		if strings.HasPrefix(query[i:], "*/") {
			return i + 2, true, nested
		}
		i++
	}
	return len(query), false, nested
}

func skipSQLQuotedValue(query string, start int, quote byte) (int, bool) {
	for i := start + 1; i < len(query); {
		if quote == '\'' && query[i] == '\\' {
			return len(query), false
		}
		if query[i] != quote {
			i++
			continue
		}
		if i+1 < len(query) && query[i+1] == quote {
			i += 2
			continue
		}
		return i + 1, true
	}
	return len(query), false
}

func sqlDollarQuoteDelimiter(query string, start int) string {
	if start+1 >= len(query) {
		return ""
	}
	if query[start+1] == '$' {
		return "$$"
	}
	if !isSQLIdentifierStart(query[start+1]) {
		return ""
	}
	for i := start + 2; i < len(query); i++ {
		if query[i] == '$' {
			return query[start : i+1]
		}
		if !isSQLIdentifierPartWithoutDollar(query[i]) {
			return ""
		}
	}
	return ""
}

func isSQLWhitespace(ch byte) bool {
	return ch == ' ' || ch == '\t' || ch == '\n' || ch == '\r' || ch == '\f' || ch == '\v'
}

func isSQLIdentifierStart(ch byte) bool {
	return ch == '_' || ch >= 'A' && ch <= 'Z' || ch >= 'a' && ch <= 'z'
}

func isSQLIdentifierPart(ch byte) bool {
	return isSQLIdentifierPartWithoutDollar(ch) || ch == '$'
}

func isSQLIdentifierPartWithoutDollar(ch byte) bool {
	return isSQLIdentifierStart(ch) || ch >= '0' && ch <= '9'
}
