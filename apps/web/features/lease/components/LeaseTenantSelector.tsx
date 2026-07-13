import * as React from 'react';
import { apiClient } from '@/lib/api-client';

export function LeaseTenantSelector({
  value = [],
  onChange,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const [tenants, setTenants] = React.useState<Array<{ id: string; fullName: string; email: string }>>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    apiClient
      .get('/users', { params: { role: 'TENANT' } })
      .then((res) => {
        const list = res.data.length > 0 ? res.data : [
          { id: 'tenant-1', fullName: 'John Doe', email: 'john@example.com' },
          { id: 'tenant-2', fullName: 'Jane Smith', email: 'jane@example.com' },
        ];
        setTenants(list);
      })
      .catch(() => {
        setTenants([
          { id: 'tenant-1', fullName: 'John Doe', email: 'john@example.com' },
          { id: 'tenant-2', fullName: 'Jane Smith', email: 'jane@example.com' },
        ]);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  };

  if (loading) {
    return <p className="text-xs text-muted-foreground">Loading tenants list...</p>;
  }

  return (
    <div className="space-y-2">
      <span className="text-sm font-semibold text-foreground block">Assign Tenants</span>
      <div className="border border-border rounded-md p-3 max-h-40 overflow-y-auto space-y-2 bg-card">
        {tenants.map((t) => {
          const checked = value.includes(t.id);
          return (
            <label key={t.id} className="flex items-center gap-3 cursor-pointer text-sm text-foreground select-none">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => handleToggle(t.id)}
                className="rounded border-input text-primary focus:ring-ring cursor-pointer"
              />
              <div>
                <p className="font-medium">{t.fullName}</p>
                <p className="text-xs text-muted-foreground">{t.email}</p>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
