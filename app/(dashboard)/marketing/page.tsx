import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Megaphone, 
  UsersRound, 
  FileInput, 
  Image,
  BarChart3,
  Mail,
  MousePointerClick,
  Target,
  Sparkles,
  Construction,
} from "lucide-react";

export default function MarketingDashboardPage() {
  const upcomingFeatures = [
    {
      name: "Campaigns",
      description: "Create and manage email, social, and multi-channel campaigns",
      icon: Megaphone,
      color: "text-orange-500 bg-orange-500/10",
    },
    {
      name: "Segments",
      description: "Build dynamic audience segments based on behavior and attributes",
      icon: UsersRound,
      color: "text-purple-500 bg-purple-500/10",
    },
    {
      name: "Forms",
      description: "Design lead capture forms with drag-and-drop builder",
      icon: FileInput,
      color: "text-blue-500 bg-blue-500/10",
    },
    {
      name: "Assets",
      description: "Manage marketing assets, images, and documents",
      icon: Image,
      color: "text-green-500 bg-green-500/10",
    },
    {
      name: "Email Builder",
      description: "Create beautiful emails with visual editor and templates",
      icon: Mail,
      color: "text-pink-500 bg-pink-500/10",
    },
    {
      name: "Landing Pages",
      description: "Build high-converting landing pages without code",
      icon: MousePointerClick,
      color: "text-cyan-500 bg-cyan-500/10",
    },
    {
      name: "A/B Testing",
      description: "Test and optimize campaigns for maximum conversion",
      icon: Target,
      color: "text-red-500 bg-red-500/10",
    },
    {
      name: "Analytics",
      description: "Track campaign performance, ROI, and attribution",
      icon: BarChart3,
      color: "text-indigo-500 bg-indigo-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Marketing Hub
            <Badge variant="secondary" className="bg-orange-100 text-orange-700">
              Coming Soon
            </Badge>
          </h1>
          <p className="text-muted-foreground">
            Campaigns, segments, and lead generation tools
          </p>
        </div>
      </div>

      {/* Coming Soon Banner */}
      <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50">
        <CardContent className="flex items-center gap-4 py-6">
          <div className="p-3 rounded-full bg-orange-100">
            <Construction className="h-8 w-8 text-orange-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">Marketing Hub is Under Construction</h3>
            <p className="text-muted-foreground">
              We're building powerful marketing automation tools. Stay tuned for updates!
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-orange-500" />
            <span className="text-sm font-medium text-orange-700">AI-Powered</span>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Features Grid */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Upcoming Features</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {upcomingFeatures.map((feature) => (
            <Card key={feature.name} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${feature.color}`}>
                  <feature.icon className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <h3 className="font-medium mb-1">{feature.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* What to Expect */}
      <Card>
        <CardHeader>
          <CardTitle>What to Expect</CardTitle>
          <CardDescription>
            The Marketing Hub will integrate seamlessly with Sales and Customer Success
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 rounded-lg bg-muted/50">
              <h4 className="font-medium mb-2">🔴 Sales Integration</h4>
              <p className="text-sm text-muted-foreground">
                Marketing qualified leads (MQLs) automatically flow to Sales pipeline
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <h4 className="font-medium mb-2">🔵 CS Integration</h4>
              <p className="text-sm text-muted-foreground">
                Customer communications and health scores inform marketing campaigns
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <h4 className="font-medium mb-2">🤖 AI-Powered</h4>
              <p className="text-sm text-muted-foreground">
                AI writes copy, optimizes send times, and predicts campaign performance
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
