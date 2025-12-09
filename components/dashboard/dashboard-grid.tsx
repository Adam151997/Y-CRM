"use client";

import { useState, useEffect, useCallback } from "react";
import { Responsive, WidthProvider, Layout } from "react-grid-layout";
import { Button } from "@/components/ui/button";
import { 
  Edit, 
  Check, 
  RotateCcw, 
  Plus,
} from "lucide-react";
import { useWorkspace, WorkspaceType } from "@/lib/workspace";
import { WidgetRenderer } from "./widget-renderer";
import { AddWidgetDialog } from "./add-widget-dialog";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const ResponsiveGridLayout = WidthProvider(Responsive);

interface WidgetConfig {
  id: string;
  type: string;
  settings?: Record<string, unknown>;
}

interface DashboardConfig {
  layout: Layout[];
  widgets: WidgetConfig[];
  isDefault: boolean;
}

export function DashboardGrid() {
  const { workspace } = useWorkspace();
  const [config, setConfig] = useState<DashboardConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddWidget, setShowAddWidget] = useState(false);

  // Fetch dashboard config
  const fetchConfig = useCallback(async () => {
    try {
      const response = await fetch(`/api/dashboard/config?workspace=${workspace}`);
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
      }
    } catch (error) {
      console.error("Error fetching dashboard config:", error);
    } finally {
      setLoading(false);
    }
  }, [workspace]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Save layout changes
  const saveLayout = async (newLayout: Layout[]) => {
    if (!config) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/dashboard/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace,
          layout: newLayout,
          widgets: config.widgets,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setConfig({ ...config, layout: data.layout, isDefault: false });
      }
    } catch (error) {
      console.error("Error saving layout:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to default layout
  const resetLayout = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/dashboard/config?workspace=${workspace}`, {
        method: "DELETE",
      });

      if (response.ok) {
        const data = await response.json();
        setConfig(data);
      }
    } catch (error) {
      console.error("Error resetting layout:", error);
    } finally {
      setIsSaving(false);
      setIsEditing(false);
    }
  };

  // Add widget
  const addWidget = async (widgetType: string) => {
    if (!config) return;

    const newWidgetId = `${widgetType}-${Date.now()}`;
    const newWidget: WidgetConfig = {
      id: newWidgetId,
      type: widgetType,
      settings: {},
    };

    // Find the lowest y position to add new widget below existing ones
    const maxY = config.layout.reduce((max, item) => Math.max(max, item.y + item.h), 0);

    const newLayoutItem: Layout = {
      i: newWidgetId,
      x: 0,
      y: maxY,
      w: 4,
      h: 3,
    };

    const newConfig = {
      ...config,
      layout: [...config.layout, newLayoutItem],
      widgets: [...config.widgets, newWidget],
    };

    setConfig(newConfig);
    setShowAddWidget(false);

    // Save immediately
    await saveLayout(newConfig.layout);
  };

  // Remove widget
  const removeWidget = async (widgetId: string) => {
    if (!config) return;

    const newConfig = {
      ...config,
      layout: config.layout.filter((item) => item.i !== widgetId),
      widgets: config.widgets.filter((w) => w.id !== widgetId),
    };

    setConfig(newConfig);

    // Save immediately
    setIsSaving(true);
    try {
      await fetch("/api/dashboard/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace,
          layout: newConfig.layout,
          widgets: newConfig.widgets,
        }),
      });
    } catch (error) {
      console.error("Error removing widget:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle layout change from drag/resize
  const onLayoutChange = (newLayout: Layout[]) => {
    if (!isEditing || !config) return;
    setConfig({ ...config, layout: newLayout });
  };

  // Save when editing stops
  const handleDoneEditing = async () => {
    if (config) {
      await saveLayout(config.layout);
    }
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Failed to load dashboard
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Dashboard Controls */}
      <div className="flex items-center justify-end gap-2">
        {isEditing ? (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddWidget(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Widget
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={resetLayout}
              disabled={isSaving}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button
              size="sm"
              onClick={handleDoneEditing}
              disabled={isSaving}
            >
              <Check className="h-4 w-4 mr-2" />
              Done
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Customize
          </Button>
        )}
      </div>

      {/* Grid Layout */}
      <ResponsiveGridLayout
        className="layout"
        layouts={{ lg: config.layout }}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={80}
        isDraggable={isEditing}
        isResizable={isEditing}
        onLayoutChange={(layout) => onLayoutChange(layout)}
        draggableHandle=".drag-handle"
        margin={[16, 16]}
      >
        {config.layout.map((item) => {
          const widget = config.widgets.find((w) => w.id === item.i);
          const widgetType = widget?.type || item.i;

          return (
            <div key={item.i}>
              <WidgetRenderer
                widgetId={widgetType}
                isEditing={isEditing}
                onRemove={() => removeWidget(item.i)}
              />
            </div>
          );
        })}
      </ResponsiveGridLayout>

      {/* Add Widget Dialog */}
      <AddWidgetDialog
        open={showAddWidget}
        onOpenChange={setShowAddWidget}
        onAddWidget={addWidget}
        workspace={workspace}
        existingWidgets={config.widgets.map((w) => w.type)}
      />
    </div>
  );
}
