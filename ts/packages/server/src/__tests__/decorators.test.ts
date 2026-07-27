import { describe, it, expect } from "vitest";
import "reflect-metadata";
import { z } from "zod";
import {
  Extension,
  EXTENSION_METADATA,
  Func,
  TestFunc,
  FUNCTION_METADATA,
  FUNCTIONS_METADATA,
  SDK_EXTENSION_NAMES,
  Ctx,
  Input,
  Body,
  PARAM_METADATA,
  FunctionParamType,
  InputSchema,
  OutputSchema,
  Description,
  INPUT_SCHEMA_METADATA,
  OUTPUT_SCHEMA_METADATA,
  DESCRIPTION_METADATA,
  Messaging,
} from "../decorators/index.js";

describe("Decorators", () => {
  describe("@Extension", () => {
    it("should set metadata with string name", () => {
      @Extension("calendar")
      class TestExtension {}

      const metadata = Reflect.getMetadata(EXTENSION_METADATA, TestExtension);
      expect(metadata).toEqual({
        name: "calendar",
        systemVersion: "v1",
        exclusive: false,
        description: undefined,
      });
    });

    it("should set metadata with options object", () => {
      @Extension({
        name: "command",
        systemVersion: "v2",
        exclusive: true,
        description: "Test description",
      })
      class AdvancedExtension {}

      const metadata = Reflect.getMetadata(EXTENSION_METADATA, AdvancedExtension);
      expect(metadata).toEqual({
        name: "command",
        systemVersion: "v2",
        exclusive: true,
        description: "Test description",
      });
    });

    it("should throw for invalid extension name", () => {
      expect(() => {
        @Extension("kospi" as any)
        class InvalidExtension {}
        void InvalidExtension;
      }).toThrow(/@Extension name "kospi" is not a valid SDK extension name/);
    });

    it("should accept all valid SDK extension names", () => {
      for (const name of SDK_EXTENSION_NAMES) {
        expect(() => {
          @Extension(name)
          class ValidExtension {}
          void ValidExtension;
        }).not.toThrow();
      }
    });

    it("should accept wms extension metadata", () => {
      expect(() => {
        @Extension({ name: "wms", systemVersion: "v1" })
        class WmsExtension {}
        void WmsExtension;
      }).not.toThrow();
    });
  });

  describe("@Func", () => {
    it("should set function metadata with method name as default", () => {
      class TestClass {
        @Func()
        testMethod() {}
      }

      const metadata = Reflect.getMetadata(FUNCTION_METADATA, TestClass, "testMethod");
      expect(metadata).toMatchObject({
        name: "testMethod",
        methodName: "testMethod",
      });

      const functions = Reflect.getMetadata(FUNCTIONS_METADATA, TestClass);
      expect(functions).toContain("testMethod");
    });

    it("should set function metadata with custom name", () => {
      class TestClass {
        @Func("custom.functionName")
        myMethod() {}
      }

      const metadata = Reflect.getMetadata(FUNCTION_METADATA, TestClass, "myMethod");
      expect(metadata).toMatchObject({
        name: "custom.functionName",
        methodName: "myMethod",
      });
    });

    it("should set function metadata with options", () => {
      class TestClass {
        @Func({ name: "options.function", description: "Test function" })
        anotherMethod() {}
      }

      const metadata = Reflect.getMetadata(FUNCTION_METADATA, TestClass, "anotherMethod");
      expect(metadata).toMatchObject({
        name: "options.function",
        methodName: "anotherMethod",
        description: "Test function",
      });
    });

    it("should default test function names to the test namespace", () => {
      class TestClass {
        @TestFunc({ description: "Create a test order" })
        createOrder() {}
      }

      const metadata = Reflect.getMetadata(FUNCTION_METADATA, TestClass, "createOrder");
      expect(metadata).toMatchObject({
        name: "test.createOrder",
        methodName: "createOrder",
        description: "Create a test order",
        test: true,
      });

      const functions = Reflect.getMetadata(FUNCTIONS_METADATA, TestClass);
      expect(functions).toContain("createOrder");
    });

    it("should preserve explicit test function names", () => {
      class TestClass {
        @TestFunc("custom.seed")
        seed() {}
      }

      const metadata = Reflect.getMetadata(FUNCTION_METADATA, TestClass, "seed");
      expect(metadata).toMatchObject({
        name: "custom.seed",
        methodName: "seed",
        test: true,
      });
    });

    it("should auto-apply @Injectable() to the class", () => {
      class StandaloneClass {
        @Func("standalone.test")
        testMethod() {}
      }

      // NestJS @Injectable() sets __injectable__ metadata on the class
      const injectableMetadata = Reflect.getMetadata("__injectable__", StandaloneClass);
      expect(injectableMetadata).toBe(true);
    });

    it("should set FUNCTIONS_METADATA on standalone class (no @Extension)", () => {
      class StandaloneFunctions {
        @Func("kospi.getIndex")
        getIndex() {}

        @Func("kospi.getChart")
        getChart() {}
      }

      const functions = Reflect.getMetadata(FUNCTIONS_METADATA, StandaloneFunctions);
      expect(functions).toHaveLength(2);
      expect(functions).toContain("getIndex");
      expect(functions).toContain("getChart");

      // No extension metadata
      const extMeta = Reflect.getMetadata(EXTENSION_METADATA, StandaloneFunctions);
      expect(extMeta).toBeUndefined();
    });

    it("should keep function metadata arrays independent across inheritance", () => {
      class ParentFunctions {
        @Func("parent.get")
        getParent() {}
      }

      class ChildFunctions extends ParentFunctions {
        @Func("child.get")
        getChild() {}
      }

      expect(Reflect.getOwnMetadata(FUNCTIONS_METADATA, ParentFunctions)).toEqual(["getParent"]);
      expect(Reflect.getOwnMetadata(FUNCTIONS_METADATA, ChildFunctions)).toEqual(["getChild"]);
    });
  });

  describe("Parameter Decorators", () => {
    it("@Ctx should set parameter metadata", () => {
      class TestClass {
        testMethod(@Ctx() _ctx: unknown) {}
      }

      const params = Reflect.getMetadata(PARAM_METADATA, TestClass, "testMethod");
      expect(params).toContainEqual({
        index: 0,
        type: FunctionParamType.CTX,
      });
    });

    it("@Input should set parameter metadata", () => {
      class TestClass {
        testMethod(@Input() _input: unknown) {}
      }

      const params = Reflect.getMetadata(PARAM_METADATA, TestClass, "testMethod");
      expect(params).toContainEqual({
        index: 0,
        type: FunctionParamType.INPUT,
      });
    });

    it("@Body should set parameter metadata", () => {
      class TestClass {
        testMethod(@Body() _body: unknown) {}
      }

      const params = Reflect.getMetadata(PARAM_METADATA, TestClass, "testMethod");
      expect(params).toContainEqual({
        index: 0,
        type: FunctionParamType.BODY,
      });
    });

    it("should handle multiple parameter decorators", () => {
      class TestClass {
        testMethod(@Ctx() _ctx: unknown, @Input() _input: unknown) {}
      }

      const params = Reflect.getMetadata(PARAM_METADATA, TestClass, "testMethod");
      expect(params).toHaveLength(2);
      expect(params).toContainEqual({ index: 0, type: FunctionParamType.CTX });
      expect(params).toContainEqual({ index: 1, type: FunctionParamType.INPUT });
    });
  });

  describe("Schema Decorators", () => {
    const testInputSchema = z.object({
      name: z.string(),
      age: z.number(),
    });

    const testOutputSchema = z.object({
      success: z.boolean(),
    });

    it("@InputSchema should set schema metadata", () => {
      class TestClass {
        @InputSchema(testInputSchema)
        testMethod() {}
      }

      const schema = Reflect.getMetadata(INPUT_SCHEMA_METADATA, TestClass, "testMethod");
      expect(schema).toBe(testInputSchema);
    });

    it("@OutputSchema should set schema metadata", () => {
      class TestClass {
        @OutputSchema(testOutputSchema)
        testMethod() {}
      }

      const schema = Reflect.getMetadata(OUTPUT_SCHEMA_METADATA, TestClass, "testMethod");
      expect(schema).toBe(testOutputSchema);
    });

    it("@Description should set description metadata", () => {
      class TestClass {
        @Description("This is a test function")
        testMethod() {}
      }

      const description = Reflect.getMetadata(DESCRIPTION_METADATA, TestClass, "testMethod");
      expect(description).toBe("This is a test function");
    });

    it("should combine all decorators", () => {
      @Extension("widget")
      class CombinedExtension {
        @Func("combined.function")
        @Description("Combined function test")
        @InputSchema(testInputSchema)
        @OutputSchema(testOutputSchema)
        async testFunction(@Ctx() _ctx: unknown, @Input() _params: unknown) {
          return { success: true };
        }
      }

      // Extension metadata
      const extMeta = Reflect.getMetadata(EXTENSION_METADATA, CombinedExtension);
      expect(extMeta.name).toBe("widget");

      // Function metadata
      const funcMeta = Reflect.getMetadata(FUNCTION_METADATA, CombinedExtension, "testFunction");
      expect(funcMeta.name).toBe("combined.function");

      // Schema metadata
      const inputSchema = Reflect.getMetadata(
        INPUT_SCHEMA_METADATA,
        CombinedExtension,
        "testFunction"
      );
      const outputSchema = Reflect.getMetadata(
        OUTPUT_SCHEMA_METADATA,
        CombinedExtension,
        "testFunction"
      );
      expect(inputSchema).toBe(testInputSchema);
      expect(outputSchema).toBe(testOutputSchema);

      // Description
      const desc = Reflect.getMetadata(DESCRIPTION_METADATA, CombinedExtension, "testFunction");
      expect(desc).toBe("Combined function test");

      // Parameter metadata
      const params = Reflect.getMetadata(PARAM_METADATA, CombinedExtension, "testFunction");
      expect(params).toHaveLength(2);
    });
  });

  describe("Messaging decorators", () => {
    it("sets the relative Function name and matching schemas together", () => {
      class MessagingExtension {
        @Messaging.inbox.onMediumMessageCreated()
        handle() {}
      }

      expect(Reflect.getMetadata(FUNCTION_METADATA, MessagingExtension, "handle")).toMatchObject({
        name: "inbox.onMediumMessageCreated",
      });
      expect(
        Reflect.getMetadata(INPUT_SCHEMA_METADATA, MessagingExtension, "handle")
      ).toBeDefined();
      expect(
        Reflect.getMetadata(OUTPUT_SCHEMA_METADATA, MessagingExtension, "handle")
      ).toBeDefined();
      expect(Reflect.getMetadata(PARAM_METADATA, MessagingExtension, "handle")).toEqual([
        { index: 0, type: FunctionParamType.CTX },
        { index: 1, type: FunctionParamType.INPUT },
      ]);
    });
  });
});
