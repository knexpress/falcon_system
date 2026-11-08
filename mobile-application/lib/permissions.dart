/// Role → feature permissions for the Falcon Revive mobile desk.
/// Any active backend user may sign in; the UI is filtered by these flags.
class FalconPermissions {
  const FalconPermissions({
    required this.role,
    required this.canViewDashboard,
    required this.canApproveQuotations,
    required this.canManageQuotations,
    required this.canManageInvoices,
    required this.canViewVehicles,
    required this.canViewInventory,
    required this.canViewCustomers,
    required this.canViewSales,
    required this.canViewExpenses,
    required this.canViewJournal,
    required this.canEditProfile,
    required this.canReceivePush,
  });

  final String role;
  final bool canViewDashboard;
  final bool canApproveQuotations;
  final bool canManageQuotations;
  final bool canManageInvoices;
  final bool canViewVehicles;
  final bool canViewInventory;
  final bool canViewCustomers;
  final bool canViewSales;
  final bool canViewExpenses;
  final bool canViewJournal;
  final bool canEditProfile;
  final bool canReceivePush;

  bool get isOwner => role == 'owner';
  bool get isStaff => role == 'staff';

  factory FalconPermissions.fromRole(String? rawRole) {
    final role = (rawRole ?? 'staff').toLowerCase().trim();
    switch (role) {
      case 'owner':
        return const FalconPermissions(
          role: 'owner',
          canViewDashboard: true,
          canApproveQuotations: true,
          // Owner can open quotes/invoices on mobile for oversight
          canManageQuotations: true,
          canManageInvoices: true,
          canViewVehicles: true,
          canViewInventory: true,
          canViewCustomers: true,
          canViewSales: false,
          canViewExpenses: false,
          canViewJournal: false,
          canEditProfile: true,
          canReceivePush: true,
        );
      case 'staff':
      default:
        return FalconPermissions(
          role: role.isEmpty ? 'staff' : role,
          canViewDashboard: true,
          canApproveQuotations: false,
          canManageQuotations: true,
          canManageInvoices: true,
          canViewVehicles: true,
          canViewInventory: true,
          canViewCustomers: true,
          canViewSales: true,
          canViewExpenses: true,
          canViewJournal: true,
          canEditProfile: true,
          canReceivePush: true,
        );
    }
  }

  bool allowsNavKey(String key) {
    switch (key) {
      case 'Dashboard':
        return canViewDashboard;
      case 'Approvals':
        return canApproveQuotations;
      case 'Quotations':
        return canManageQuotations;
      case 'Invoices':
        return canManageInvoices;
      case 'Vehicles':
        return canViewVehicles;
      case 'Inventory':
        return canViewInventory;
      case 'Customers':
        return canViewCustomers;
      case 'Sales':
        return canViewSales;
      case 'Expenses':
        return canViewExpenses;
      case 'Journal':
        return canViewJournal;
      case 'Profile':
        return canEditProfile;
      default:
        return false;
    }
  }
}
