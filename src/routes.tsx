import { RouteObject } from 'react-router-dom';
import HomePage from './pages/index';
import QuizSharePage from './pages/quiz/ShareId';
import QuizCreatedPage from './pages/quiz/created';
import ResultsPage from './pages/results/ShareId';
import GuideViewPage from './pages/guide/ShareId';
import NotFoundPage from './pages/_404';

export type Path = '/' | '/quiz/created' | '/quiz/:shareId' | '/results/:shareId' | '/guide/:shareId';
export type Params = Record<string, string | undefined>;

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/quiz/created',
    element: <QuizCreatedPage />,
  },
  {
    path: '/quiz/:shareId',
    element: <QuizSharePage />,
  },
  {
    path: '/results/:shareId',
    element: <ResultsPage />,
  },
  {
    path: '/guide/:shareId',
    element: <GuideViewPage />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
];
