import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../auth.dart';
import '../widgets/glass.dart';
import 'document_detail_screen.dart';
import 'list_screen.dart';
import 'quotation_form_screen.dart';

class InvoicesScreen extends StatefulWidget {
  const InvoicesScreen({super.key});

  @override
  State<InvoicesScreen> createState() => _InvoicesScreenState();
}

class _InvoicesScreenState extends State<InvoicesScreen> {
  int _reloadToken = 0;

  Future<void> _openCreate() async {
    final created = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => const QuotationFormScreen(docType: 'invoice'),
      ),
    );
    if (created == true && mounted) {
      setState(() => _reloadToken++);
    }
  }

  Future<void> _openDetail(Map<String, dynamic> row) async {
    await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => DocumentDetailScreen(
          documentId: row['id'],
          initial: row,
        ),
      ),
    );
    if (mounted) setState(() => _reloadToken++);
  }

  @override
  Widget build(BuildContext context) {
    final canManage =
        context.watch<AuthStore>().user?.permissions.canManageInvoices == true;

    return Stack(
      children: [
        KeyedSubtree(
          key: ValueKey(_reloadToken),
          child: ListScreen(
            title: 'Invoices',
            subtitle:
                'Tap to view PDF, edit, share, or issue credit / debit notes',
            loader: (api) => api.getInvoices(),
            mapItem: invoiceMapper,
            emptyTitle: 'No invoices',
            emptyBody: 'Paid and sent invoices will appear here.',
            onItemTap: _openDetail,
          ),
        ),
        if (canManage)
          Positioned(
            right: 16,
            bottom: 20,
            child: Material(
              color: Colors.transparent,
              child: FalconButton(
                label: 'New invoice',
                onPressed: _openCreate,
              ),
            ),
          ),
      ],
    );
  }
}
