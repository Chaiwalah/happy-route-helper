
import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DeliveryOrder } from '@/utils/csvParser';
import { toast } from '@/components/ui/use-toast';

interface DataTableProps {
  data: DeliveryOrder[];
  onOrdersUpdated: (orders: DeliveryOrder[]) => void;
}

export function DataTable({ data, onOrdersUpdated }: DataTableProps) {
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Initialize local state when data changes
  useEffect(() => {
    setOrders(data);
  }, [data]);

  const handleEdit = (id: string) => {
    setEditingId(id);
  };

  const handleSave = (id: string) => {
    setEditingId(null);
    
    // Notify parent component of changes
    onOrdersUpdated(orders);
    
    toast({
      description: "Changes saved successfully",
    });
  };

  const handleCancel = () => {
    // Reset to original data
    setOrders(data);
    setEditingId(null);
    
    toast({
      description: "Changes discarded",
    });
  };

  const handleChange = (id: string, field: keyof DeliveryOrder, value: string) => {
    setOrders(orders.map(order => 
      order.id === id ? { ...order, [field]: value } : order
    ));
  };

  // Filter orders based on search term with null checks
  const filteredOrders = orders.filter(order => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (order.driver?.toLowerCase() || '').includes(searchLower) ||
      (order.pickup?.toLowerCase() || '').includes(searchLower) ||
      (order.dropoff?.toLowerCase() || '').includes(searchLower) ||
      (order.id?.toLowerCase() || '').includes(searchLower)
    );
  });

  return (
    <div className="w-full space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-medium">Delivery Orders</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            View and edit order details before generating invoices
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Input 
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
        </div>
      </div>
      
      <div className="rounded-md border overflow-hidden glass-card subtle-shadow">
        <div className="max-h-[28rem] overflow-auto">
          <Table>
            <TableHeader className="bg-gray-50/80 dark:bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
              <TableRow>
                <TableHead className="w-[80px]">ID</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Pickup</TableHead>
                <TableHead>Dropoff</TableHead>
                <TableHead>Time Window</TableHead>
                <TableHead className="text-right">Distance</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order, index) => (
                  <TableRow 
                    key={order.id}
                    className={`stagger-item ${index % 2 === 0 ? 'bg-white/50 dark:bg-gray-950/20' : 'bg-gray-50/50 dark:bg-gray-900/10'} transition-all`}
                  >
                    <TableCell className="font-mono text-xs">{order.id || ''}</TableCell>
                    <TableCell>
                      {editingId === order.id ? (
                        <Input 
                          value={order.driver || ''}
                          onChange={(e) => handleChange(order.id, 'driver', e.target.value)}
                          className="w-full"
                        />
                      ) : (
                        order.driver || ''
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {editingId === order.id ? (
                        <Input 
                          value={order.pickup || ''}
                          onChange={(e) => handleChange(order.id, 'pickup', e.target.value)}
                          className="w-full"
                        />
                      ) : (
                        order.pickup || ''
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {editingId === order.id ? (
                        <Input 
                          value={order.dropoff || ''}
                          onChange={(e) => handleChange(order.id, 'dropoff', e.target.value)}
                          className="w-full"
                        />
                      ) : (
                        order.dropoff || ''
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === order.id ? (
                        <div className="flex space-x-2">
                          <Input 
                            value={order.timeWindowStart || ''}
                            onChange={(e) => handleChange(order.id, 'timeWindowStart', e.target.value)}
                            className="w-20 text-xs"
                            placeholder="Start"
                          />
                          <span className="text-gray-500">-</span>
                          <Input 
                            value={order.timeWindowEnd || ''}
                            onChange={(e) => handleChange(order.id, 'timeWindowEnd', e.target.value)}
                            className="w-20 text-xs"
                            placeholder="End"
                          />
                        </div>
                      ) : (
                        <span>
                          {order.timeWindowStart || 'N/A'} - {order.timeWindowEnd || 'N/A'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {order.estimatedDistance ? (
                        <span className="font-medium">
                          {order.estimatedDistance.toFixed(1)} mi
                        </span>
                      ) : (
                        <span className="text-gray-500">N/A</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {editingId === order.id ? (
                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" size="sm" onClick={() => handleCancel()}>
                            Cancel
                          </Button>
                          <Button size="sm" onClick={() => handleSave(order.id)}>
                            Save
                          </Button>
                        </div>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(order.id)}>
                          Edit
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    {data.length === 0 ? (
                      <span className="text-gray-500 dark:text-gray-400">No data available. Please upload a CSV file.</span>
                    ) : (
                      <span className="text-gray-500 dark:text-gray-400">No results found for "{searchTerm}"</span>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
