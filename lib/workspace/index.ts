export { 
  WorkspaceProvider, 
  useWorkspace, 
  useWorkspaceSafe, 
  detectWorkspaceFromPath,
  isGlobalRoutePath,
  WORKSPACES 
} from "./workspace-context";
export type { WorkspaceType, WorkspaceConfig } from "./workspace-context";
export { 
  WORKSPACE_NAVIGATION, 
  GLOBAL_NAVIGATION,
  getWorkspaceNavigation 
} from "./navigation-config";
export type { NavItem, NavSection } from "./navigation-config";
