import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.SHOP_SESSION_SECRET!);

export type ShopSessionPayload = {
  store_id: number;
  store_slug: string;
  store_name: string;
  role: "merchant";
};

const COOKIE_NAME = "shop_session";

export async function signShopSession(payload: ShopSessionPayload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifyShopSession(token: string) {
  const { payload } = await jwtVerify(token, secret);
  return payload as unknown as ShopSessionPayload;
}

export const shopSessionCookieName = COOKIE_NAME;