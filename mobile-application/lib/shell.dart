import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'auth.dart';
import 'screens/approvals_screen.dart';
import 'screens/dashboard_screen.dart';
import 'screens/list_screen.dart';
import 'screens/login_screen.dart';
import 'screens/profile_screen.dart';
import 'widgets/glass.dart';

class FalconAppRoot extends StatelessWidget {
  const FalconAppRoot({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthStore>();
    if (!auth.ready) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }
    if (auth.user == null) return const LoginScreen();
    return const MainShell();
  }
}

class MainShell extends StatefulWidget {
  const MainShell({super.key});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  late String _active;

  @override
  void initState() {
    super.initState();
    final role = context.read<AuthStore>().user?.role;
    _active = visibleNav(role).first.key;
  }

  Widget _page() {
    switch (_active) {
      case 'Approvals':
        return const ApprovalsScreen();
      case 'Quotations':
        return ListScreen(
          title: 'Quotations',
          subtitle: 'Awaiting Cedrick or already decided',
          loader: (api) => api.getQuotations(),
          mapItem: invoiceMapper,
          emptyTitle: 'No quotations',
          emptyBody: 'Create quotations from the desk or wait for submissions.',
        );
      case 'Invoices':
        return ListScreen(
          title: 'Invoices',
          subtitle: 'Tax invoices and approved quotes',
          loader: (api) => api.getInvoices(),
          mapItem: invoiceMapper,
          emptyTitle: 'No invoices',
          emptyBody: 'Paid and sent invoices will appear here.',
        );
      case 'Vehicles':
        return ListScreen(
          title: 'Vehicles',
          subtitle: 'Workshop vehicle register',
          loader: (api) => api.getVehicles(),
          mapItem: vehicleMapper,
          emptyTitle: 'No vehicles',
          emptyBody: 'Vehicles sync from invoices and the vehicles desk.',
        );
      case 'Inventory':
        return ListScreen(
          title: 'Inventory',
          subtitle: 'Paint, parts, and consumables',
          loader: (api) => api.getInventory(),
          mapItem: inventoryMapper,
          emptyTitle: 'Stock is empty',
          emptyBody: 'Add inventory items from the stock desk.',
        );
      case 'Customers':
        return ListScreen(
          title: 'Customers',
          subtitle: 'Workshop client list',
          loader: (api) => api.getCustomers(),
          mapItem: customerMapper,
          emptyTitle: 'No customers',
          emptyBody: 'Customers appear when records are created.',
        );
      case 'Sales':
        return ListScreen(
          title: 'Sales',
          subtitle: 'Income entries',
          loader: (api) => api.getSales(),
          mapItem: saleMapper,
          emptyTitle: 'No sales',
          emptyBody: 'Walk-in and invoice-linked sales show here.',
        );
      case 'Expenses':
        return ListScreen(
          title: 'Expenses',
          subtitle: 'Workshop outflow',
          loader: (api) => api.getExpenses(),
          mapItem: expenseMapper,
          emptyTitle: 'No expenses',
          emptyBody: 'Log parts and vendor spends to fill this list.',
        );
      case 'Journal':
        return ListScreen(
          title: 'Journal',
          subtitle: 'Unified tally',
          loader: (api) async {
            final data = await api.getJournal();
            return List<dynamic>.from(data['entries'] as List? ?? []);
          },
          mapItem: journalMapper,
          emptyTitle: 'No journal entries',
          emptyBody: 'Invoices, sales, and expenses post into the journal.',
        );
      case 'Profile':
        return const ProfileScreen();
      case 'Dashboard':
      default:
        return const DashboardScreen();
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthStore>().user;
    final role = user?.role;
    // Profile opens from the emblem — keep chips for workspace pages only.
    final items =
        visibleNav(role).where((n) => n.key != 'Profile').toList();
    if (items.isNotEmpty &&
        _active != 'Profile' &&
        !items.any((n) => n.key == _active)) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) setState(() => _active = items.first.key);
      });
    }

    return GlassBackground(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: SafeArea(
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 10, 12, 6),
                child: GlassToolbar(
                  child: Row(
                    children: [
                      Tooltip(
                        message: 'Profile',
                        child: Material(
                          color: Colors.transparent,
                          child: InkWell(
                            onTap: () =>
                                setState(() => _active = 'Profile'),
                            borderRadius: BorderRadius.circular(14),
                            child: Ink(
                              decoration: BoxDecoration(
                                color: Colors.black,
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(
                                  color: Colors.white.withValues(alpha: 0.35),
                                ),
                                boxShadow: const [
                                  BoxShadow(
                                    color: Color(0x33000000),
                                    blurRadius: 10,
                                    offset: Offset(0, 4),
                                  ),
                                ],
                              ),
                              child: Padding(
                                padding: const EdgeInsets.all(5),
                                child: Image.asset(
                                  'assets/falcon_revive_emblem.png',
                                  width: 34,
                                  height: 34,
                                  fit: BoxFit.contain,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: SingleChildScrollView(
                          scrollDirection: Axis.horizontal,
                          child: Row(
                            children: items.map((item) {
                              return Padding(
                                padding: const EdgeInsets.only(right: 6),
                                child: GlassPill(
                                  label: item.label,
                                  selected: item.key == _active,
                                  onTap: () =>
                                      setState(() => _active = item.key),
                                ),
                              );
                            }).toList(),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              Expanded(child: _page()),
            ],
          ),
        ),
      ),
    );
  }
}
