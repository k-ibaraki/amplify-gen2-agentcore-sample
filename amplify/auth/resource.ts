import { defineAuth } from "@aws-amplify/backend";
import { preSignUp } from "./pre-signup/resource.ts";

const redirectUrls = (
  process.env.AUTH_REDIRECT_URLS ?? "http://localhost:5173/"
)
  .split(",")
  .map((url) => url.trim());

export const auth = defineAuth({
  loginWith: {
    email: true,
    externalProviders: {
      callbackUrls: redirectUrls,
      logoutUrls: redirectUrls,
    },
  },
  triggers: {
    preSignUp,
  },
});
