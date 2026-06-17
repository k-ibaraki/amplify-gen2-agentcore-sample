import type { PreSignUpTriggerHandler } from "aws-lambda";

export const handler: PreSignUpTriggerHandler = async (event) => {
  const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN;
  if (!allowedDomain) {
    throw new Error("ALLOWED_EMAIL_DOMAIN is not configured.");
  }
  const email = event.request.userAttributes.email ?? "";
  if (!email.endsWith(`@${allowedDomain}`)) {
    throw new Error(`Sign-up is restricted to @${allowedDomain} accounts.`);
  }
  return event;
};
