
import { z } from "zod";

export const LoginCredentialsValidator = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password cannot be empty." }), // Min 1 for login, actual length check by Firebase
});
export type LoginCredentials = z.infer<typeof LoginCredentialsValidator>;


export const SignUpCredentialsValidator = z.object({
  displayName: z.string().min(3, { message: "Name must be at least 3 characters long." }).max(50, { message: "Name cannot exceed 50 characters."}),
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters long." }),
  confirmPassword: z.string().min(6, { message: "Please confirm your password." }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"], // Path to show the error on
});

export type SignUpCredentials = z.infer<typeof SignUpCredentialsValidator>;
