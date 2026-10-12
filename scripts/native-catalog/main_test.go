package main

import (
	"go/ast"
	"go/parser"
	"go/token"
	"testing"
)

func TestOperationArguments(t *testing.T) {
	cases := []struct {
		name, code string
		invalid    bool
	}{
		{"multiline method", `func f(){ c.CallNativeFunction(ctx, token,
   "notInCatalog", params) }`, true},
		{"generic multiline helper", `func f(){ callNative[Result](ctx, c, token,
   "notInCatalog", params) }`, true},
		{"exported helper", `func f(){ CallNative[Result](ctx, c, token, "notInCatalog", params) }`, true},
		{"cross-file constant", `const FunctionExample = "notInCatalog"`, true},
		{"constant expression", `const action = "notIn" + "Catalog"; func f(){c.CallNativeFunction(ctx, token, action, params)}`, true},
		{"local constant", `func f(){const operation="notInCatalog"; c.CallNativeFunction(ctx, token, operation, params)}`, true},
		{"local variable shadows constant", `const operation="notInCatalog"; func f(operation string){c.CallNativeFunction(ctx, token, operation, params)}`, false},
		{"argument boundaries", `func f(){ c.CallNativeFunction(ctx, "token-not-operation", "getChannel", map[string]string{"field":"notInCatalog"}); other("notInCatalog") }`, false},
		{"dynamic generic transport", `func f(){c.CallNativeFunction(ctx, token, method, params); other("notInCatalog")}`, false},
		{"raw string", "func f(){c.CallNativeFunction(ctx, token, `notInCatalog`, params)}", true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			file, err := parser.ParseFile(token.NewFileSet(), "fixture.go", "package native\n"+tc.code, 0)
			if err != nil {
				t.Fatal(err)
			}
			err = checkFiles([]*ast.File{file}, map[string]bool{"getChannel": true})
			if (err != nil) != tc.invalid {
				t.Fatalf("invalid=%v, error=%v", tc.invalid, err)
			}
		})
	}
}
