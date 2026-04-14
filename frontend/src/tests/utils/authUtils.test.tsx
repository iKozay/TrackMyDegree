import { describe, it, expect } from "vitest";
import {
  validateEmail,
  validatePassword,
  passwordsMatch,
  validateRequiredFields,
  validateLoginForm,
  validateSignupForm,
} from "../../utils/authUtils";

describe("authUtils", () => {
  describe("validateEmail", () => {
    it("returns true for valid email addresses", () => {
      expect(validateEmail("test@example.com")).toBe(true);
      expect(validateEmail("user.name@domain.co.uk")).toBe(true);
      expect(validateEmail("test123@test.org")).toBe(true);
    });

    it("returns false for invalid email addresses", () => {
      expect(validateEmail("")).toBe(false);
      expect(validateEmail("notanemail")).toBe(false);
      expect(validateEmail("@example.com")).toBe(false);
      expect(validateEmail("test@")).toBe(false);
      expect(validateEmail("test@domain")).toBe(false);
      expect(validateEmail("test @example.com")).toBe(false);
    });
  });

  describe("validatePassword", () => {
    it("returns true for passwords meeting minimum length", () => {
      expect(validatePassword("123456")).toBe(true);
      expect(validatePassword("password123")).toBe(true);
      expect(validatePassword("abcdefgh", 6)).toBe(true);
    });

    it("returns false for passwords below minimum length", () => {
      expect(validatePassword("12345")).toBe(false);
      expect(validatePassword("abc")).toBe(false);
      expect(validatePassword("")).toBe(false);
    });

    it("respects custom minimum length", () => {
      expect(validatePassword("12345", 5)).toBe(true);
      expect(validatePassword("1234", 5)).toBe(false);
      expect(validatePassword("12345678", 8)).toBe(true);
    });
  });

  describe("passwordsMatch", () => {
    it("returns true when passwords match", () => {
      expect(passwordsMatch("password123", "password123")).toBe(true);
      expect(passwordsMatch("test", "test")).toBe(true);
    });

    it("returns false when passwords do not match", () => {
      expect(passwordsMatch("password123", "password124")).toBe(false);
      expect(passwordsMatch("test", "Test")).toBe(false);
      expect(passwordsMatch("abc", "")).toBe(false);
    });
  });

  describe("validateRequiredFields", () => {
    it("returns true when all fields are filled", () => {
      expect(validateRequiredFields("name", "email", "password")).toBe(true);
      expect(validateRequiredFields("test", 123, true)).toBe(true);
    });

    it("returns false when any field is empty", () => {
      expect(validateRequiredFields("", "email", "password")).toBe(false);
      expect(validateRequiredFields("name", "", "password")).toBe(false);
      expect(validateRequiredFields(null, "email", "password")).toBe(false);
      expect(validateRequiredFields(undefined, "email", "password")).toBe(false);
    });

    it("trims whitespace for string fields", () => {
      expect(validateRequiredFields("  ", "email")).toBe(false);
      expect(validateRequiredFields("name  ", "  email  ")).toBe(true);
    });
  });

  describe("validateLoginForm", () => {
    it("returns empty array for valid login credentials", () => {
      const errors = validateLoginForm("test@example.com", "password123");
      expect(errors).toEqual([]);
    });

    it("returns error when fields are empty", () => {
      const errors = validateLoginForm("", "");
      expect(errors).toContain("Both email and password are required.");
    });

    it("returns error for invalid email format", () => {
      const errors = validateLoginForm("invalidemail", "password123");
      expect(errors).toContain("Please enter a valid email address.");
    });

    it("returns multiple errors when applicable", () => {
      const errors = validateLoginForm("", "");
      expect(errors.length).toBeGreaterThan(0);
      expect(errors).toContain("Both email and password are required.");
    });
  });

  describe("validateSignupForm", () => {
    it("returns empty array for valid signup data", () => {
      const errors = validateSignupForm(
        "John Doe",
        "john@example.com",
        "password123",
        "password123"
      );
      expect(errors).toEqual([]);
    });

    it("returns error when required fields are empty", () => {
      const errors = validateSignupForm("", "", "", "");
      expect(errors).toContain("All fields are required.");
    });

    it("returns error for invalid email", () => {
      const errors = validateSignupForm(
        "John Doe",
        "invalidemail",
        "password123",
        "password123"
      );
      expect(errors).toContain("Please enter a valid email address.");
    });

    it("returns error when passwords do not match", () => {
      const errors = validateSignupForm(
        "John Doe",
        "john@example.com",
        "password123",
        "password456"
      );
      expect(errors).toContain("Passwords do not match.");
    });

    it("returns error for short password", () => {
      const errors = validateSignupForm(
        "John Doe",
        "john@example.com",
        "12345",
        "12345"
      );
      expect(errors).toContain("Password should be at least 6 characters long.");
    });

    it("returns multiple errors when applicable", () => {
      const errors = validateSignupForm("", "invalidemail", "123", "456");
      expect(errors.length).toBeGreaterThan(1);
      expect(errors).toContain("All fields are required.");
    });
  });
});
