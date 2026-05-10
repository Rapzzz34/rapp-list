import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";

import { Layout } from "@/components/layout";
import { Dashboard } from "@/pages/dashboard";
import { CategoryList } from "@/pages/category-list";
import { StatsPage } from "@/pages/stats";
import { SearchPage } from "@/pages/search";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AppRouter() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/drakor">
          {() => <CategoryList category="drakor" title="Korean Dramas" />}
        </Route>
        <Route path="/webtoon">
          {() => <CategoryList category="webtoon" title="Webtoons" />}
        </Route>
        <Route path="/short-dracin">
          {() => <CategoryList category="short-dracin" title="Short Dracin" />}
        </Route>
        <Route path="/indo">
          {() => <CategoryList category="indo" title="Indonesian" />}
        </Route>
        <Route path="/stats" component={StatsPage} />
        <Route path="/search" component={SearchPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppRouter />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
