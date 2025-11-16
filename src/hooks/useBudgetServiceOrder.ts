/**
 * Hook para gerenciar estado persistente de ordem de serviço criada a partir de orçamento
 * Mantém o estado mesmo após recarregar a página
 */

import { useState, useEffect } from 'react';

interface BudgetServiceOrderItem {
  orderId: string;
  formattedId?: string;
  createdAt: string;
}

interface BudgetServiceOrdersData {
  budgetId: string;
  orders: BudgetServiceOrderItem[];
}

export const useBudgetServiceOrder = (budgetId: string) => {
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [formattedId, setFormattedId] = useState<string | null>(null);
  const [createdOrderCount, setCreatedOrderCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  // Chave para armazenar dados da ordem de serviço no localStorage
  const storageKey = `budget_service_orders_${budgetId}`;

  // Carregar dados do localStorage na inicialização
  useEffect(() => {
    const loadStoredData = () => {
      try {
        const storedData = localStorage.getItem(storageKey);
        if (storedData) {
          const parsedData: BudgetServiceOrdersData = JSON.parse(storedData);
          // Limpeza: manter apenas ordens dos últimos 30 dias
          const now = new Date();
          const validOrders = parsedData.orders.filter(item => {
            const createdAt = new Date(item.createdAt);
            const daysDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
            return daysDiff <= 30;
          });

          if (validOrders.length > 0) {
            const last = validOrders[validOrders.length - 1];
            setCreatedOrderId(last.orderId);
            setFormattedId(last.formattedId || null);
            setCreatedOrderCount(validOrders.length);
            // Persistir limpeza se houve remoção
            if (validOrders.length !== parsedData.orders.length) {
              const sanitized: BudgetServiceOrdersData = { budgetId, orders: validOrders };
              localStorage.setItem(storageKey, JSON.stringify(sanitized));
            }
          } else {
            localStorage.removeItem(storageKey);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar dados da ordem de serviço:', error);
        localStorage.removeItem(storageKey);
      } finally {
        setIsLoading(false);
      }
    };

    loadStoredData();
  }, [budgetId, storageKey]);

  // Função para salvar ordem de serviço criada
  const saveCreatedOrder = (orderId: string, orderFormattedId?: string) => {
    try {
      const storedData = localStorage.getItem(storageKey);
      const existing: BudgetServiceOrdersData = storedData ? JSON.parse(storedData) : { budgetId, orders: [] };

      const newItem: BudgetServiceOrderItem = {
        orderId,
        formattedId: orderFormattedId,
        createdAt: new Date().toISOString()
      };

      const updated: BudgetServiceOrdersData = {
        budgetId,
        orders: [...existing.orders, newItem]
      };

      localStorage.setItem(storageKey, JSON.stringify(updated));
      setCreatedOrderId(orderId);
      setFormattedId(orderFormattedId || null);
      setCreatedOrderCount(updated.orders.length);
    } catch (error) {
      console.error('Erro ao salvar dados da ordem de serviço:', error);
    }
  };

  // Função para limpar dados salvos
  const clearSavedOrder = () => {
    try {
      localStorage.removeItem(storageKey);
      setCreatedOrderId(null);
      setFormattedId(null);
      setCreatedOrderCount(0);
    } catch (error) {
      console.error('Erro ao limpar dados da ordem de serviço:', error);
    }
  };

  // Função para verificar se há ordem criada
  const hasCreatedOrder = () => {
    return createdOrderCount > 0;
  };

  // Função para obter URL de compartilhamento
  const getShareUrl = () => {
    if (!createdOrderId) return null;
    return `${window.location.origin}/share/service-order/${createdOrderId}`;
  };

  return {
    createdOrderId,
    formattedId,
    createdOrderCount,
    isLoading,
    hasCreatedOrder: hasCreatedOrder(),
    saveCreatedOrder,
    clearSavedOrder,
    getShareUrl
  };
};