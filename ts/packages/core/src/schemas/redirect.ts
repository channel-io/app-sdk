import { z } from "zod";

export const HTTPSRedirectOriginSchema = z
  .string()
  .url()
  .regex(/^https:\/\/[^/?#@\\\s*]+$/)
  .refine((value) => {
    try {
      return new URL(value).origin === value;
    } catch {
      return false;
    }
  }, "Expected a canonical HTTPS origin");

export const HTTPSRedirectURLSchema = z
  .string()
  .url()
  .regex(/^https:\/\/[^/?#@\\\s]+(?:[/?#][^\\\s]*)?$/);
