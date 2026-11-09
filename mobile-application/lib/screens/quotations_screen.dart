import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../auth.dart';
import '../widgets/glass.dart';
import 'document_detail_screen.dart';
import 'list_screen.dart';
import 'quotation_form_screen.dart';

class QuotationsScreen extends StatefulWidget {
  const QuotationsScreen({super.key});

  @override
  State<QuotationsScreen> createState() => _QuotationsScreenState();
}

class _QuotationsScreenState extends State<QuotationsScreen> {
  int _reloadToken = 0;

  Future<void> _openCreate() async {
    final created = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => const QuotationFormScreen()),
    );
    if (created == true && mounted) {
      setState(() => _reloadToken++);
    }
  }

  Future<void> _openDetail(Map<String, dynamic> row) async {
    final changed = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => DocumentDetailScreen(
          documentId: row['id'],
          initial: row,
        ),
      ),
    );
    if (changed == true && mounted) {
      setState(() => _reloadToken++);
    } else if (mounted) {
      // Refresh quietly after view/edit/PDF actions that stay on list
      setState(() => _reloadToken++);
    }
  }

  @override
  Widget build(BuildContext context) {
    final canCreate =
        context.watch<AuthStore>().user?.permissions.canManageQuotations ==
            true;

    return Stack(
      children: [
        KeyedSubtree(
          key: ValueKey(_reloadToken),
          child: ListScreen(
            title: 'Quotations',
            subtitle: 'Tap a quote to view, edit, or Generate invoice',
            loader: (api) => api.getQuotations(),
            mapItem: invoiceMapper,
            emptyTitle: 'No quotations yet',
            emptyBody: canCreate
                ? 'Tap New quotation to start one for a client.'
                : 'Quotations will appear here when created.',
            onItemTap: _openDetail,
          ),
        ),
        if (canCreate)
          Positioned(
            right: 16,
            bottom: 20,
            child: Material(
              color: Colors.transparent,
              child: FalconButton(
                label: 'New quotation',
                onPressed: _openCreate,
              ),
            ),
          ),
      ],
    );
  }
}
