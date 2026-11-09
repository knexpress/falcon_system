import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../api.dart';
import '../auth.dart';
import '../theme.dart';
import '../widgets/glass.dart';

typedef ListLoader = Future<List<dynamic>> Function(Api api);
typedef ItemMapper = ({
  String title,
  String? meta,
  String? badge,
  String? value
}) Function(Map<String, dynamic> row);

class ListScreen extends StatefulWidget {
  const ListScreen({
    super.key,
    required this.title,
    required this.subtitle,
    required this.loader,
    required this.mapItem,
    required this.emptyTitle,
    required this.emptyBody,
    this.onItemTap,
  });

  final String title;
  final String subtitle;
  final ListLoader loader;
  final ItemMapper mapItem;
  final String emptyTitle;
  final String emptyBody;
  final Future<void> Function(Map<String, dynamic> row)? onItemTap;

  @override
  State<ListScreen> createState() => _ListScreenState();
}

class _ListScreenState extends State<ListScreen> {
  List<dynamic>? _rows;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final api = Api(context.read<AuthStore>());
      final rows = await widget.loader(api);
      if (!mounted) return;
      setState(() => _rows = rows);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _rows = [];
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final rows = _rows;
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 88),
        children: [
          Text(widget.title,
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  )),
          Text(widget.subtitle,
              style: const TextStyle(color: FalconColors.muted)),
          if (_error != null) ...[
            const SizedBox(height: 10),
            Text(_error!, style: const TextStyle(color: FalconColors.danger)),
          ],
          const SizedBox(height: 12),
          if (rows == null)
            const Padding(
              padding: EdgeInsets.all(40),
              child: Center(child: CircularProgressIndicator()),
            )
          else if (rows.isEmpty)
            EmptyHint(title: widget.emptyTitle, body: widget.emptyBody)
          else
            ...rows.map((raw) {
              final row = Map<String, dynamic>.from(raw as Map);
              final item = widget.mapItem(row);
              final card = GlassCard(
                strong: true,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(item.title,
                              style: const TextStyle(
                                  fontWeight: FontWeight.w700, fontSize: 16)),
                        ),
                        if (item.badge != null)
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.7),
                              borderRadius: BorderRadius.circular(999),
                            ),
                            child: Text(item.badge!,
                                style: const TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700)),
                          ),
                      ],
                    ),
                    if (item.meta != null) ...[
                      const SizedBox(height: 4),
                      Text(item.meta!,
                          style:
                              const TextStyle(color: FalconColors.muted)),
                    ],
                    if (item.value != null) ...[
                      const SizedBox(height: 8),
                      Text(item.value!,
                          style: const TextStyle(
                              fontWeight: FontWeight.w800, fontSize: 16)),
                    ],
                  ],
                ),
              );
              return Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: widget.onItemTap == null
                    ? card
                    : Material(
                        color: Colors.transparent,
                        child: InkWell(
                          borderRadius: BorderRadius.circular(22),
                          onTap: () => widget.onItemTap!(row),
                          child: card,
                        ),
                      ),
              );
            }),
        ],
      ),
    );
  }
}

ItemMapper invoiceMapper = (row) => (
      title: (row['customer_name'] ?? row['invoice_number'] ?? '—').toString(),
      meta:
          '${row['invoice_number'] ?? ''} · ${formatDate(row['issue_date'])}',
      badge: row['status']?.toString(),
      value: money(row['total']),
    );

ItemMapper vehicleMapper = (row) => (
      title: [
        row['make'],
        row['model']
      ].where((e) => e != null && e.toString().isNotEmpty).join(' ').ifEmpty('Vehicle'),
      meta: [
        row['plate_number'] ?? row['plate'],
        row['customer_name']
      ].where((e) => e != null && e.toString().isNotEmpty).join(' · '),
      badge: row['year']?.toString(),
      value: null,
    );

ItemMapper inventoryMapper = (row) => (
      title: (row['name'] ?? 'Item').toString(),
      meta: '${row['sku'] ?? 'No SKU'} · ${row['category'] ?? '—'}',
      badge:
          '${row['quantity_on_hand'] ?? row['quantity'] ?? 0} ${row['unit'] ?? ''}',
      value: money(row['sell_price'] ?? row['cost_price'] ?? 0),
    );

ItemMapper customerMapper = (row) => (
      title: (row['name'] ?? 'Customer').toString(),
      meta: [
        row['phone'],
        row['email'],
        row['trn']
      ].where((e) => e != null && e.toString().isNotEmpty).join(' · ').ifEmpty('No contact'),
      badge: null,
      value: null,
    );

ItemMapper saleMapper = (row) => (
      title: (row['description'] ?? 'Sale').toString(),
      meta: '${formatDate(row['sale_date'])} · ${row['category'] ?? 'sale'}',
      badge: null,
      value: money(row['amount']),
    );

ItemMapper expenseMapper = (row) => (
      title: (row['description'] ?? 'Expense').toString(),
      meta:
          '${formatDate(row['expense_date'])} · ${row['category'] ?? 'expense'}',
      badge: null,
      value: money(row['amount']),
    );

ItemMapper journalMapper = (row) => (
      title: (row['description'] ?? row['reference'] ?? 'Entry').toString(),
      meta: '${formatDate(row['date'])} · ${row['entry_type']}',
      badge: row['posting_status']?.toString(),
      value: ((row['credit'] as num?) ?? 0) > 0
          ? '+ ${money(row['credit'])}'
          : ((row['debit'] as num?) ?? 0) > 0
              ? '- ${money(row['debit'])}'
              : money(row['amount']),
    );

extension on String {
  String ifEmpty(String fallback) => isEmpty ? fallback : this;
}
