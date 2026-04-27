import { createBrowserRouter, Outlet, RouterProvider } from 'react-router-dom';
import RootLayout from './layouts/RootLayout';
import { routes } from './routes';

// Create router with layout wrapper
const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <RootLayout>
        <Outlet />
      </RootLayout>
    ),
    children: routes,
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
