import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../api.dart';
import '../auth.dart';
import '../theme.dart';
import '../widgets/glass.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  Map<String, dynamic>? _data;
  String? _error;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final api = Api(context.read<AuthStore>());
      final data = await api.getDashboard();
      if (!mounted) return;
      setState(() {
        _data = data;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthStore>().user;
    final d = _data;

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
        children: [
          Text('Dashboard',
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  )),
          Text(
            'Hello ${auth?.name ?? 'team'} · ${auth?.isSuperAdmin == true ? 'Superadmin' : auth?.isOwner == true ? 'Owner' : 'Staff'}',
            style: const TextStyle(color: FalconColors.muted),
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: const TextStyle(color: FalconColors.danger)),
          ],
          if (_loading && d == null)
            const Padding(
              padding: EdgeInsets.all(40),
              child: Center(child: CircularProgressIndicator()),
            ),
          if (d != null) ...[
            const SizedBox(height: 16),
            LayoutBuilder(
              builder: (context, constraints) {
                const gap = 10.0;
                final cardW = (constraints.maxWidth - gap) / 2;
                final metrics = [
                  (
                    'Month income',
                    money(d['month_income'] ?? d['month_sales']),
                    FalconColors.violet
                  ),
                  (
                    'Month expenses',
                    money(d['month_expenses']),
                    FalconColors.blue
                  ),
                  (
                    'Month profit',
                    money(d['month_profit']),
                    FalconColors.mint
                  ),
                  (
                    'Outstanding',
                    money(d['outstanding_amount']),
                    FalconColors.peach
                  ),
                ];
                return Column(
                  children: [
                    for (var row = 0; row < 2; row++) ...[
                      if (row > 0) const SizedBox(height: gap),
                      Row(
                        children: [
                          for (var col = 0; col < 2; col++) ...[
                            if (col > 0) const SizedBox(width: gap),
                            SizedBox(
                              width: cardW,
                              child: _metric(
                                metrics[row * 2 + col].$1,
                                metrics[row * 2 + col].$2,
                                metrics[row * 2 + col].$3,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ],
                  ],
                );
              },
            ),
            const SizedBox(height: 14),
            GlassCard(
              strong: true,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Recent invoices',
                      style: TextStyle(
                          fontSize: 18, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  ...((d['recent_invoices'] as List?) ?? []).take(5).map((inv) {
                    final m = Map<String, dynamic>.from(inv as Map);
                    return ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text(m['customer_name']?.toString() ?? '—',
                          style: const TextStyle(fontWeight: FontWeight.w700)),
                      subtitle: Text(
                          '${m['invoice_number']} · ${m['status']}',
                          style: const TextStyle(color: FalconColors.muted)),
                      trailing: Text(money(m['total']),
                          style: const TextStyle(fontWeight: FontWeight.w800)),
                    );
                  }),
                  if (((d['recent_invoices'] as List?) ?? []).isEmpty)
                    const EmptyHint(
                      title: 'No invoices yet',
                      body:
                          'New tax invoices and quotations will show up here.',
                    ),
                ],
              ),
            ),
            if (auth?.isOwner == true &&
                (d['pending_approvals'] as num? ?? 0) > 0) ...[
              const SizedBox(height: 12),
              GlassCard(
                child: Text(
                  '${d['pending_approvals']} quotation(s) waiting — open Approvals.',
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ],
        ],
      ),
    );
  }

  Widget _metric(String label, String value, Color color) {
    return Container(
      height: 92,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: 0.28),
            blurRadius: 12,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(18),
        child: Stack(
          children: [
            Positioned.fill(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      color,
                      Color.lerp(color, Colors.white, 0.18)!,
                    ],
                  ),
                ),
              ),
            ),
            Positioned(
              right: -14,
              top: -14,
              child: Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.white.withValues(alpha: 0.16),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.94),
                      fontWeight: FontWeight.w600,
                      fontSize: 12.5,
                    ),
                  ),
                  const Spacer(),
                  Text(
                    value,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w800,
                      fontSize: 15,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
