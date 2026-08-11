/// <reference types="vite/client" />
/// <reference types="@react-router/node" />

declare namespace NodeJS {
  interface ProcessEnv {
    SHOPIFY_TEST_MODE?: string;
  }
}
