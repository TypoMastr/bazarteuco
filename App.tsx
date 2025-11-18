import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { ViewState } from './types';
import { Dashboard } from './pages/Dashboard';
import { ProductList } from './pages/Products';
import { ProductForm } from './pages/ProductForm';
import { CategoryList } from './pages/CategoryList';
import { CategoryForm } from './pages/CategoryForm';
import { Settings } from './pages/Settings';
import { checkAuth } from './services/api';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>({ name: 'dashboard' });
  const [history, setHistory] = useState<ViewState[]>([]);

  useEffect(() => {
    if (!checkAuth()) {
      setView({ name: 'settings' });
    }
  }, []);

  const navigate = (newView: ViewState) => {
    setHistory(prev => [...prev, view]);
    setView(newView);
  };

  const goBack = () => {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setHistory(prevH => prevH.slice(0, -1));
      setView(prev);
    } else {
      setView({ name: 'dashboard' });
    }
  };

  // Specific Back handlers for forms ensuring they go to list
  const handleFormBack = (target: 'products' | 'categories') => {
    setView({ name: target } as ViewState);
  };

  return (
    <Layout currentView={view} onNavigate={(v) => { setHistory([]); setView(v); }}>
      <div className="animate-in fade-in duration-300 h-full">
        {view.name === 'dashboard' && <Dashboard />}
        
        {view.name === 'products' && (
          <ProductList onEdit={(id) => navigate({ name: 'product-form', productId: id })} />
        )}
        
        {view.name === 'product-form' && (
          <ProductForm 
            productId={view.productId} 
            onBack={() => handleFormBack('products')} 
            onSave={() => handleFormBack('products')} 
          />
        )}

        {view.name === 'categories' && (
          <CategoryList onEdit={(id) => navigate({ name: 'category-form', categoryId: id })} />
        )}

        {view.name === 'category-form' && (
          <CategoryForm 
            categoryId={view.categoryId} 
            onBack={() => handleFormBack('categories')} 
            onSave={() => handleFormBack('categories')} 
          />
        )}

        {view.name === 'settings' && <Settings />}
      </div>
    </Layout>
  );
};

export default App;