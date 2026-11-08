import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:pdfx/pdfx.dart';
import 'package:provider/provider.dart';
import '../api.dart';
import '../auth.dart';
import '../theme.dart';
import '../widgets/glass.dart';

class ApprovalsScreen extends StatefulWidget {
  const ApprovalsScreen({super.key});

  @override
  State<ApprovalsScreen> createState() => _ApprovalsScreenState();
}

class _ApprovalsScreenState extends State<ApprovalsScreen> {
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
      final rows = await Api(context.read<AuthStore>()).getPendingApprovals();
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

  Future<void> _open(Map<String, dynamic> row) async {
    final api = Api(context.read<AuthStore>());
    try {
      final full = await api.getInvoice(row['id']);
      if (!mounted) return;
      await showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        useSafeArea: true,
        backgroundColor: const Color(0xF7F4F1FB),
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
        builder: (_) => _ApprovalSheet(
          invoice: full,
          onDone: _load,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    final rows = _rows;
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
        children: [
          Text('Approvals',
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  )),
          const Text(
            'Open the PDF preview, then approve or send back with a note',
            style: TextStyle(color: FalconColors.muted),
          ),
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
            const EmptyHint(
              title: 'All clear',
              body: 'No quotations are waiting for Cedrick’s approval.',
            )
          else
            ...rows.map((raw) {
              final row = Map<String, dynamic>.from(raw as Map);
              return Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: GlassCard(
                  strong: true,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(row['invoice_number']?.toString() ?? 'Quotation',
                          style: const TextStyle(
                              fontWeight: FontWeight.w700, fontSize: 17)),
                      Text(
                        '${row['customer_name']} · ${formatDate(row['issue_date'])} · ${money(row['total'])}',
                        style: const TextStyle(color: FalconColors.muted),
                      ),
                      const SizedBox(height: 12),
                      FalconButton(
                        label: 'Review',
                        onPressed: () => _open(row),
                      ),
                    ],
                  ),
                ),
              );
            }),
        ],
      ),
    );
  }
}

class _ApprovalSheet extends StatefulWidget {
  const _ApprovalSheet({required this.invoice, required this.onDone});
  final Map<String, dynamic> invoice;
  final Future<void> Function() onDone;

  @override
  State<_ApprovalSheet> createState() => _ApprovalSheetState();
}

class _ApprovalSheetState extends State<_ApprovalSheet> {
  bool _sendBack = false;
  final _note = TextEditingController();
  bool _busy = false;
  String? _error;
  String? _pdfError;
  bool _pdfLoading = true;
  PdfControllerPinch? _pdfController;

  @override
  void initState() {
    super.initState();
    _loadPdf();
  }

  Future<void> _loadPdf() async {
    setState(() {
      _pdfLoading = true;
      _pdfError = null;
    });
    try {
      final bytes =
          await Api(context.read<AuthStore>()).getInvoicePdf(widget.invoice['id']);
      if (!mounted) return;
      _pdfController?.dispose();
      setState(() {
        _pdfController = PdfControllerPinch(
          document: PdfDocument.openData(Uint8List.fromList(bytes)),
        );
        _pdfLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _pdfError = e.toString();
        _pdfLoading = false;
      });
    }
  }

  @override
  void dispose() {
    _note.dispose();
    _pdfController?.dispose();
    super.dispose();
  }

  Future<void> _approve() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await Api(context.read<AuthStore>()).approveInvoice(widget.invoice['id']);
      if (!mounted) return;
      Navigator.pop(context);
      await widget.onDone();
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _send() async {
    final note = _note.text.trim();
    if (note.isEmpty) {
      setState(() => _error = 'A note is required when sending back.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await Api(context.read<AuthStore>())
          .sendBackQuotation(widget.invoice['id'], note);
      if (!mounted) return;
      Navigator.pop(context);
      await widget.onDone();
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final inv = widget.invoice;
    final height = MediaQuery.of(context).size.height * 0.92;

    return SizedBox(
      height: height,
      child: Padding(
        padding: EdgeInsets.only(
          left: 16,
          right: 16,
          top: 14,
          bottom: MediaQuery.of(context).viewInsets.bottom + 16,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 42,
                height: 4,
                decoration: BoxDecoration(
                  color: FalconColors.muted.withValues(alpha: 0.35),
                  borderRadius: BorderRadius.circular(99),
                ),
              ),
            ),
            const SizedBox(height: 12),
            Text(inv['invoice_number']?.toString() ?? 'Quotation',
                style:
                    const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
            Text(
              '${inv['customer_name']} · ${money(inv['total'])}',
              style: const TextStyle(color: FalconColors.muted),
            ),
            if (_error != null) ...[
              const SizedBox(height: 8),
              Text(_error!, style: const TextStyle(color: FalconColors.danger)),
            ],
            const SizedBox(height: 10),
            Expanded(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(18),
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.55),
                    border: Border.all(
                        color: Colors.white.withValues(alpha: 0.7)),
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: _buildPdfArea(),
                ),
              ),
            ),
            const SizedBox(height: 12),
            if (_sendBack) ...[
              TextField(
                controller: _note,
                maxLines: 3,
                decoration: glassFieldDecoration('Note (required)'),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: FalconButton(
                      label: 'Back',
                      ghost: true,
                      onPressed: _busy
                          ? null
                          : () => setState(() => _sendBack = false),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: FalconButton(
                      label: _busy ? 'Sending…' : 'Send back',
                      danger: true,
                      onPressed: _busy ? null : _send,
                    ),
                  ),
                ],
              ),
            ] else
              Row(
                children: [
                  Expanded(
                    child: FalconButton(
                      label: 'Send back',
                      ghost: true,
                      onPressed: _busy
                          ? null
                          : () => setState(() => _sendBack = true),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: FalconButton(
                      label: _busy ? 'Approving…' : 'Confirm approve',
                      onPressed: _busy ? null : _approve,
                    ),
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildPdfArea() {
    if (_pdfLoading) {
      return const Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 12),
            Text('Loading PDF…', style: TextStyle(color: FalconColors.muted)),
          ],
        ),
      );
    }
    if (_pdfError != null) {
      return Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              _pdfError!,
              textAlign: TextAlign.center,
              style: const TextStyle(color: FalconColors.danger),
            ),
            const SizedBox(height: 14),
            FalconButton(
              label: 'Retry PDF',
              ghost: true,
              onPressed: _loadPdf,
            ),
          ],
        ),
      );
    }
    final controller = _pdfController;
    if (controller == null) {
      return const Center(child: Text('No PDF'));
    }
    return PdfViewPinch(
      controller: controller,
      padding: 8,
      backgroundDecoration: const BoxDecoration(
        color: Color(0xFFF7F5FB),
      ),
    );
  }
}
