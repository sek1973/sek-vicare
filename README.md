# ViCare Monitor

An Angular 22 app for monitoring and controlling your Viessmann gas boiler with radio-controlled thermostats via the official [Viessmann IoT API](https://developer.viessmann.com/).

## How to register as a Viessmann developer

> You need an existing **ViCare account** (the same one you use in the mobile app). Registration takes about 2 minutes.

1. **Open the developer portal** — [https://app.developer.viessmann.com](https://app.developer.viessmann.com)
2. **Sign in** with your ViCare email and password.
3. In the **Clients** section click **Add**.
4. Fill in the form:
   - **Name** — any name, e.g. `ViCare Monitor`
   - **Google reCAPTCHA** — **Disabled**
   - **Redirect URIs** — add `http://localhost:4200/callback`
5. Click **Create** and copy the generated **Client ID**.

> The API uses OAuth 2.0 with PKCE — no client secret is needed.

## Getting started

### 1 — Configure your Client ID

Open `src/environments/environment.ts` and replace:

```ts
clientId: 'YOUR_CLIENT_ID',
```

### 2 — Install and run

```bash
npm install
ng serve
```

Open [http://localhost:4200](http://localhost:4200).

## API rate limits

Viessmann enforces **120 calls/hour** on the free tier. The statistics poller defaults to every **5 minutes** (`pollingIntervalMs` in `environment.ts`).

---

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.0.3.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
