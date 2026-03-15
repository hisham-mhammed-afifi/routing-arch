import architectureOverview from '../files/01-architecture-overview.md?raw';
import routeArchitecture from '../files/02-route-architecture.md?raw';
import moduleReference from '../files/03-module-reference.md?raw';
import supportingInfrastructure from '../files/04-supporting-infrastructure.md?raw';
import currentStateGap from '../files/05-current-state-gap.md?raw';
import routingChecklist from '../files/06-routing-checklist.md?raw';

export interface DocEntry {
  slug: string;
  title: string;
  content: string;
}

export const docs: DocEntry[] = [
  { slug: '01-architecture-overview', title: 'Architecture Overview', content: architectureOverview },
  { slug: '02-route-architecture', title: 'Route Architecture', content: routeArchitecture },
  { slug: '03-module-reference', title: 'Module Reference', content: moduleReference },
  { slug: '04-supporting-infrastructure', title: 'Supporting Infrastructure', content: supportingInfrastructure },
  { slug: '05-current-state-gap', title: 'Current State & Gap', content: currentStateGap },
  { slug: '06-routing-checklist', title: 'Routing Checklist', content: routingChecklist },
];
