import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { Amplify } from "aws-amplify";
import outputs from "../../../packages/shared-backend/amplify_outputs.json";
import { I18n } from "aws-amplify/utils";
import { translations } from "@aws-amplify/ui-react";

I18n.putVocabularies(translations);
I18n.setLanguage("ja");

const origin = `${window.location.origin}/`;
outputs.auth.oauth.redirect_sign_in_uri = [origin];
outputs.auth.oauth.redirect_sign_out_uri = [origin];
Amplify.configure(outputs);

// Reactをmountするroot要素がHTMLに存在することを起動時に検証する。
const root = document.getElementById("root");
if (!root) {
  throw new Error("React root element is unavailable");
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
