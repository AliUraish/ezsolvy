 Goal
      Ensure all frontend routes correctly communicate with their corresponding backend endpoints and that the overall routing flow between the client and server is fully integrated and functional.

      Route Discovery
      - Identify all frontend routes (e.g., React, Next.js, Vue, etc.).
      - Identify all backend API endpoints (e.g., Express, NestJS, Django, etc.).
      - Map each frontend route to its relevant backend endpoint or data source.
      - Verify that all required endpoints exist and are reachable.

      Connection Validation
      - Check that API calls (fetch, axios, etc.) are correctly configured for each route.
      - Validate endpoint URLs, methods (GET, POST, PUT, DELETE), and parameters.
      - Ensure consistent naming conventions between frontend and backend routes.
      - Verify that environment variables (e.g., API base URLs) are correctly set.
      - Confirm proper handling of CORS, authentication tokens, and headers.

      Data Flow & Response Handling
      - Trace data flow from the frontend component → API request → backend controller → response → frontend state/UI.
      - Ensure backend responses match the expected frontend data structure.
      - Handle loading, success, and error states gracefully.
      - Confirm consistent error handling between client and server.

      Optimization & Cleanup
      - Detect unused or unreachable routes and endpoints.
      - Suggest deletion of redundant route handlers.
      - Consolidate similar routes or endpoints where possible.
      - Standardize route patterns for clarity and scalability.

      Testing & Verification
      - Test all connected routes using real or mock data.
      - Verify that each page correctly loads its associated backend data.
      - Recommend automated tests for key routes and endpoints.
      - Check that 404 and error routes behave correctly.

      Documentation & Maintenance
      - Generate or update a route map showing frontend ↔ backend connections.
      - Document base URLs, route naming patterns, and data contracts.
      - Recommend best practices for adding new routes and endpoints.
      - Ensure future developers can easily understand and extend the routing system.

  - name: Safety & Clarity
    content: |
      16. Don’t send code that could break builds or affect production.
      17. Don’t suggest commands that modify local or remote environments unless I ask.
      18. If something’s unclear or risky, ask before proceeding.