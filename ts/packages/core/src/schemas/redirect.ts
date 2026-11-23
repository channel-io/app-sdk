import { z } from "zod";

export const HTTPSRedirectOriginSchema = z
  .string()
  .regex(/^https:\/\/[^/?#@\\\s*]+$/)
  .check(z.url())
  .refine((value) => {
    try {
      return new URL(value).origin === value;
    } catch {
      return false;
    }
  }, "Expected a canonical HTTPS origin");

export const HTTPSRedirectURLSchema = z
  .string()
  .regex(/^https:\/\/[^/?#@\\\s]+(?:[/?#][^\\\s]*)?$/)
  .check(z.url());
