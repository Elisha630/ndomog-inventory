import { AlertTriangle } from "lucide-react";

interface StatsCardsProps {
  totalItems: number;
  totalCost: number;
  potentialProfit: number;
  lowStockCount: number;
}

const StatsCards = ({ totalItems, totalCost, potentialProfit, lowStockCount }: StatsCardsProps) => {
  const formatCurrency = (amount: number) => {
    return `KES ${amount.toLocaleString()}`;
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="stat-card animate-fade-in" style={{ animationDelay: "0ms" }}>
        <p className="text-sm text-muted-foreground">Total Items</p>
        <p className="text-2xl font-bold text-foreground">{totalItems}</p>
      </div>

      <div className="stat-card animate-fade-in" style={{ animationDelay: "50ms" }}>
        <p className="text-sm text-muted-foreground">Total Cost</p>
        <p className="text-2xl font-bold text-foreground">{formatCurrency(totalCost)}</p>
      </div>

      <div className="stat-card animate-fade-in" style={{ animationDelay: "100ms" }}>
        <p className="text-sm text-muted-foreground">Potential Profit</p>
        <p className="text-2xl font-bold text-success">{formatCurrency(potentialProfit)}</p>
      </div>

      <div className="stat-card animate-fade-in" style={{ animationDelay: "150ms" }}>
        <p className="text-sm text-muted-foreground flex items-center gap-1">
          <AlertTriangle size={14} className="text-warning" />
          Low Stock
        </p>
        <p className={`text-2xl font-bold ${lowStockCount > 0 ? "text-warning" : "text-foreground"}`}>
          {lowStockCount}
        </p>
      </div>
    </div>
  );
};

export default StatsCards;
