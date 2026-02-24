import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../config/db";
import { config } from "../config";

export interface AuthResult {
  user: { id: string; email: string; name: string };
  accessToken: string;
  refreshToken: string;
}

export interface UserPayload {
  userId: string;
  email: string;
}

/**
 * Auth service — self-hosted JWT implementation.
 * Designed behind a clean interface so it can be swapped for Cognito later.
 */
export const authService = {
  async register(
    email: string,
    password: string,
    name: string
  ): Promise<AuthResult> {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AuthError("Email already registered", 409);
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, passwordHash, name },
    });

    await prisma.userSettings.create({ data: { userId: user.id } });

    const tokens = await generateTokens(user.id, user.email);
    return {
      user: { id: user.id, email: user.email, name: user.name },
      ...tokens,
    };
  },

  async login(email: string, password: string): Promise<AuthResult> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AuthError("Invalid email or password", 401);
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new AuthError("Invalid email or password", 401);
    }

    const tokens = await generateTokens(user.id, user.email);
    return {
      user: { id: user.id, email: user.email, name: user.name },
      ...tokens,
    };
  },

  async refresh(refreshTokenValue: string): Promise<AuthResult> {
    let payload: UserPayload;
    try {
      payload = jwt.verify(
        refreshTokenValue,
        config.jwt.refreshSecret
      ) as UserPayload;
    } catch {
      throw new AuthError("Invalid refresh token", 401);
    }

    const stored = await prisma.refreshToken.findUnique({
      where: { token: refreshTokenValue },
    });
    if (!stored || stored.expiresAt < new Date()) {
      throw new AuthError("Refresh token expired or revoked", 401);
    }

    await prisma.refreshToken.delete({ where: { id: stored.id } });

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });
    if (!user) {
      throw new AuthError("User not found", 404);
    }

    const tokens = await generateTokens(user.id, user.email);
    return {
      user: { id: user.id, email: user.email, name: user.name },
      ...tokens,
    };
  },

  verifyToken(token: string): UserPayload {
    try {
      return jwt.verify(token, config.jwt.secret) as UserPayload;
    } catch {
      throw new AuthError("Invalid or expired token", 401);
    }
  },

  async logout(userId: string): Promise<void> {
    await prisma.refreshToken.deleteMany({ where: { userId } });
  },
};

async function generateTokens(
  userId: string,
  email: string
): Promise<{ accessToken: string; refreshToken: string }> {
  const payload: UserPayload = { userId, email };

  const accessToken = jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as string,
  } as jwt.SignOptions);

  const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn as string,
  } as jwt.SignOptions);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.refreshToken.create({
    data: { token: refreshToken, userId, expiresAt },
  });

  return { accessToken, refreshToken };
}

export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = "AuthError";
  }
}
