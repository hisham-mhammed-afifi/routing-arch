# 05. State Management

## 5.1 Current Approach: BehaviorSubjects

This works. No need to migrate to NgRx for the sake of it. The architecture formalizes the pattern.

---

## 5.2 State Layers

```
Global State (CoreModule services, singleton)
  - AuthState: current user, token, isAuthenticated
  - BrandState: current brand config
  - WorkspaceContextState: current workspace, user role in this workspace, subscription
  - NotificationState: unread count, toast queue

Module State (provided in feature module, destroyed on navigation away)
  - InboxState: conversations, selected conversation, messages
  - AnalyticsState: selected date range, chart data, filters
  - PlaygroundState: current flow, test conversation
  - etc.
```

---

## 5.3 Conventions

Each state service follows a consistent pattern:

```typescript
@Injectable()
export class InboxState {
  // Private writeable subjects
  private _conversations$ = new BehaviorSubject<Conversation[]>([]);
  private _selectedId$ = new BehaviorSubject<string | null>(null);
  private _loading$ = new BehaviorSubject<boolean>(false);

  // Public read-only observables
  readonly conversations$ = this._conversations$.asObservable();
  readonly selectedId$ = this._selectedId$.asObservable();
  readonly loading$ = this._loading$.asObservable();

  // Derived state
  readonly selectedConversation$ = combineLatest([
    this._conversations$,
    this._selectedId$,
  ]).pipe(
    map(([convs, id]) => convs.find(c => c.id === id) ?? null)
  );

  // Methods that mutate state
  setConversations(conversations: Conversation[]): void { ... }
  selectConversation(id: string): void { ... }
}
```

Rules:
- State services expose observables, never raw subjects
- Mutation happens through named methods, not direct `.next()` from outside
- Module-scoped state is `providedIn` the feature module, not root
- Global state is `providedIn: 'root'`

---

## 5.4 Migration Path to Signals (Angular 17+)

When upgrading to Angular 17+, BehaviorSubjects can be incrementally replaced with `signal()` and `computed()`. The pattern above maps 1:1:

```
BehaviorSubject  -->  WritableSignal (private)
.asObservable()  -->  Signal (public, via .asReadonly())
combineLatest    -->  computed()
```

No big-bang migration needed. New code uses signals, old code stays on BehaviorSubjects until touched.
