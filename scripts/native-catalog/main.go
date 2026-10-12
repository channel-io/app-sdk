// Command native-catalog checks statically named Go native operations.
package main

import (
	"encoding/json"
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

func functionName(expr ast.Expr) string {
	switch n := expr.(type) {
	case *ast.Ident:
		return n.Name
	case *ast.SelectorExpr:
		return n.Sel.Name
	case *ast.IndexExpr:
		return functionName(n.X)
	case *ast.IndexListExpr:
		return functionName(n.X)
	case *ast.ParenExpr:
		return functionName(n.X)
	}
	return ""
}

func stringValue(expr ast.Expr, constants map[string]ast.Expr, seen map[string]bool) (string, bool) {
	switch n := expr.(type) {
	case *ast.BasicLit:
		if n.Kind == token.STRING {
			v, err := strconv.Unquote(n.Value)
			return v, err == nil
		}
	case *ast.ParenExpr:
		return stringValue(n.X, constants, seen)
	case *ast.BinaryExpr:
		if n.Op == token.ADD {
			a, okA := stringValue(n.X, constants, seen)
			b, okB := stringValue(n.Y, constants, seen)
			return a + b, okA && okB
		}
	case *ast.Ident:
		if seen[n.Name] {
			return "", false
		}
		value, ok := constants[n.Name]
		if n.Obj != nil {
			if n.Obj.Kind != ast.Con {
				return "", false
			}
			if spec, matched := n.Obj.Decl.(*ast.ValueSpec); matched {
				ok = false
				for i, name := range spec.Names {
					if name.Name == n.Name && i < len(spec.Values) {
						value, ok = spec.Values[i], true
					}
				}
			}
		}
		if !ok {
			return "", false
		}
		seen[n.Name] = true
		result, resolved := stringValue(value, constants, seen)
		delete(seen, n.Name)
		return result, resolved
	}
	return "", false
}

func checkFiles(files []*ast.File, allowed map[string]bool) error {
	constants := map[string]ast.Expr{}
	for _, file := range files {
		for _, decl := range file.Decls {
			gen, ok := decl.(*ast.GenDecl)
			if !ok || gen.Tok != token.CONST {
				continue
			}
			for _, spec := range gen.Specs {
				value := spec.(*ast.ValueSpec)
				for i, name := range value.Names {
					if i < len(value.Values) {
						constants[name.Name] = value.Values[i]
					}
				}
			}
		}
	}
	check := func(expr ast.Expr) error {
		if name, known := stringValue(expr, constants, map[string]bool{}); known && !allowed[name] {
			return fmt.Errorf("native operation is not in the supported catalog")
		}
		return nil
	}
	for name, expr := range constants {
		if strings.HasPrefix(name, "Function") {
			if err := check(expr); err != nil {
				return err
			}
		}
	}
	var invalid error
	for _, file := range files {
		ast.Inspect(file, func(node ast.Node) bool {
			if invalid != nil {
				return false
			}
			call, ok := node.(*ast.CallExpr)
			if !ok {
				return true
			}
			index := -1
			switch functionName(call.Fun) {
			case "CallNativeFunction":
				index = 2
			case "callNative", "CallNative":
				index = 3
			}
			if index >= 0 && index < len(call.Args) {
				invalid = check(call.Args[index])
			}
			return true
		})
	}
	return invalid
}

func run(root string) error {
	data, err := os.ReadFile(filepath.Join(root, "catalog/native-functions.json"))
	if err != nil {
		return err
	}
	var catalog struct {
		Functions []struct {
			Name string `json:"name"`
		} `json:"functions"`
	}
	if err = json.Unmarshal(data, &catalog); err != nil {
		return err
	}
	allowed := map[string]bool{}
	for _, entry := range catalog.Functions {
		allowed[entry.Name] = true
	}
	filenames, err := filepath.Glob(filepath.Join(root, "go/native/*.go"))
	if err != nil {
		return err
	}
	var files []*ast.File
	for _, filename := range filenames {
		if strings.HasSuffix(filename, "_test.go") {
			continue
		}
		file, err := parser.ParseFile(token.NewFileSet(), filename, nil, 0)
		if err != nil {
			return err
		}
		files = append(files, file)
	}
	return checkFiles(files, allowed)
}
func main() {
	if len(os.Args) != 2 {
		fmt.Fprintln(os.Stderr, "usage: native-catalog <repository>")
		os.Exit(1)
	}
	if err := run(os.Args[1]); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
