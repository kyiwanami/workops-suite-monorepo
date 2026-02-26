import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { Amplify } from "aws-amplify";
import outputs from "../../packages/shared-backend/amplify_outputs.json";
import { I18n } from "aws-amplify/utils";
import { translations } from "@aws-amplify/ui-react";

I18n.putVocabularies(translations);
I18n.setLanguage("ja");

Amplify.configure(outputs);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
