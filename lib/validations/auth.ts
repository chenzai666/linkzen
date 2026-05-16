import * as z from "zod";

export const userAuthSchema = z.object({
  email: z.string().email(),
});

export const userPasswordAuthSchema = z.object({
  name: z.string().optional(),
  email: z.string().min(1, "请输入用户名"),
  password: z.string().min(6),
});

export const updateUserSchema = z.object({
  email: z.string().min(1, "请输入用户名"),
  image: z.string().optional(),
  name: z.string(),
  active: z.number().default(1),
  role: z.string(),
  password: z.string().optional(),
});
