import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:pdfx/pdfx.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';
import '../api.dart';
import '../auth.dart';
import '../theme.dart';
import '../widgets/glass.dart';
import 'quotation_form_screen.dart';

/// View PDF, edit, share/download, credit/debit note, generate invoice —
/// same actions as the website document desk, kept in one organized screen.
class DocumentDetailScreen extends StatefulWidget {
  const DocumentDetailScreen({
    super.key,
    required this.documentId,
    this.initial,
  });

  final Object documentId;
  final Map<String, dynamic>? initial;

  @override
  State<DocumentDetailScreen> createState() => _DocumentDetailScreenState();
}

class _DocumentDetailScreenState extends State<DocumentDetailScreen> {
  Map<String, dynamic>? _doc;
  String? _error;
  bool _loading = true;
  bool _busy = false;

  String? _pdfError;
  bool _pdfLoading = true;
  PdfControllerPinch? _pdfController;
  Uint8List? _pdfBytes;

  @override
  void initState() {
    super.initState();
    _doc = widget.initial;
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final full =
          await Api(context.read<AuthStore>()).getInvoice(widget.documentId);
      if (!mounted) return;
      setState(() {
        _doc = full;
        _loading = false;
      });
      await _loadPdf();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  Future<void> _loadPdf() async {
    final id = _doc?['id'] ?? widget.documentId;
    setState(() {
      _pdfLoading = true;
      _pdfError = null;
    });
    try {
      final bytes = await Api(context.read<AuthStore>()).getInvoicePdf(id);
      if (!mounted) return;
      _pdfController?.dispose();
      setState(() {
        _pdfBytes = bytes;
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
    _pdfController?.dispose();
    super.dispose();
  }

  bool get _isQuotation =>
      (_doc?['doc_type']?.toString() ?? '').toLowerCase() == 'quotation';

  String get _status => (_doc?['status']?.toString() ?? '').toLowerCase();

  bool get _canEdit {
    if (_doc == null) return false;
    if (_isQuotation) return _status != 'cancelled';
    return _status != 'credit_note' && _status != 'debit_note';
  }

  bool get _canGenerateInvoice =>
      _isQuotation && _status != 'cancelled';

  bool get _canCredit {
    if (_isQuotation) return false;
    return _status != 'credit_note';
  }

  bool get _canDebit {
    if (_isQuotation) return false;
    return _status != 'credit_note' && _status != 'debit_note';
  }

  Future<void> _sharePdf() async {
    final bytes = _pdfBytes;
    final doc = _doc;
    if (bytes == null || doc == null) {
      await _loadPdf();
      if (_pdfBytes == null) return;
    }
    final data = _pdfBytes!;
    final number =
        (doc?['invoice_number'] ?? widget.documentId).toString().replaceAll(
              RegExp(r'[^\w\-]+'),
              '_',
            );
    setState(() => _busy = true);
    try {
      final dir = await getTemporaryDirectory();
      final file = File('${dir.path}/$number.pdf');
      await file.writeAsBytes(data, flush: true);
      await SharePlus.instance.share(
        ShareParams(
          files: [XFile(file.path, mimeType: 'application/pdf')],
          subject: number,
          text: 'Falcon Revive · $number',
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _edit() async {
    final doc = _doc;
    if (doc == null) return;
    final changed = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => QuotationFormScreen(
          documentId: doc['id'],
          docType: _isQuotation ? 'quotation' : 'invoice',
        ),
      ),
    );
    if (changed == true && mounted) {
      await _bootstrap();
    }
  }

  Future<bool> _confirm(String title, String body) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(title),
        content: Text(body),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Confirm'),
          ),
        ],
      ),
    );
    return ok == true;
  }

  Future<void> _creditNote() async {
    final doc = _doc;
    if (doc == null) return;
    final api = Api(context.read<AuthStore>());
    final messenger = ScaffoldMessenger.of(context);
    final number = doc['invoice_number']?.toString() ?? 'invoice';
    final ok = await _confirm(
      'Credit note',
      'Issue credit note for $number? The invoice stays on file and linked income is reversed.',
    );
    if (!ok || !mounted) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final updated = await api.issueCreditNote(doc['id']);
      if (!mounted) return;
      setState(() => _doc = updated);
      await _loadPdf();
      if (!mounted) return;
      messenger.showSnackBar(
        const SnackBar(content: Text('Credit note issued')),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _debitNote() async {
    final doc = _doc;
    if (doc == null) return;
    final api = Api(context.read<AuthStore>());
    final messenger = ScaffoldMessenger.of(context);
    final number = doc['invoice_number']?.toString() ?? 'invoice';
    final ok = await _confirm(
      'Debit note',
      'Issue debit note for $number? Amount posts as additional income / charge due.',
    );
    if (!ok || !mounted) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final updated = await api.issueDebitNote(doc['id']);
      if (!mounted) return;
      setState(() => _doc = updated);
      await _loadPdf();
      if (!mounted) return;
      messenger.showSnackBar(
        const SnackBar(content: Text('Debit note issued')),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _generateInvoice() async {
    final doc = _doc;
    if (doc == null) return;
    final api = Api(context.read<AuthStore>());
    final messenger = ScaffoldMessenger.of(context);
    final nav = Navigator.of(context);
    final number = doc['invoice_number']?.toString() ?? 'quotation';
    final ok = await _confirm(
      'Generate invoice',
      'Generate tax invoice from $number? This posts the journal entry.',
    );
    if (!ok || !mounted) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final created = await api.generateInvoiceFromQuotation(doc['id']);
      if (!mounted) return;
      messenger.showSnackBar(
        SnackBar(
          content: Text(
            'Invoice ${created['invoice_number'] ?? ''} created',
          ),
        ),
      );
      nav.pop(true);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final doc = _doc;
    final title = doc?['invoice_number']?.toString() ??
        (_isQuotation ? 'Quotation' : 'Invoice');

    return GlassBackground(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          foregroundColor: FalconColors.ink,
          title: Text(title,
              style: const TextStyle(fontWeight: FontWeight.w800)),
        ),
        body: SafeArea(
          child: _loading && doc == null
              ? const Center(child: CircularProgressIndicator())
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (doc != null) ...[
                            Text(
                              '${doc['customer_name'] ?? '—'} · ${money(doc['total'])}',
                              style: const TextStyle(color: FalconColors.muted),
                            ),
                            const SizedBox(height: 6),
                            Wrap(
                              spacing: 8,
                              runSpacing: 6,
                              children: [
                                _chip(_isQuotation ? 'Quotation' : 'Invoice'),
                                if (doc['status'] != null)
                                  _chip(doc['status'].toString()),
                              ],
                            ),
                          ],
                          if (_error != null) ...[
                            const SizedBox(height: 8),
                            Text(_error!,
                                style:
                                    const TextStyle(color: FalconColors.danger)),
                          ],
                        ],
                      ),
                    ),
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
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
                    ),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                      child: _actionGrid(),
                    ),
                  ],
                ),
        ),
      ),
    );
  }

  Widget _chip(String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.7),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
      ),
    );
  }

  Widget _actionGrid() {
    final actions = <Widget>[
      FalconButton(
        label: _busy ? 'Working…' : 'Share / download PDF',
        onPressed: _busy || _pdfBytes == null ? null : _sharePdf,
      ),
      if (_canEdit)
        FalconButton(
          label: 'Edit',
          ghost: true,
          onPressed: _busy ? null : _edit,
        ),
      if (_canGenerateInvoice)
        FalconButton(
          label: 'Generate invoice',
          onPressed: _busy ? null : _generateInvoice,
        ),
      if (_canCredit)
        FalconButton(
          label: 'Credit note',
          danger: true,
          onPressed: _busy ? null : _creditNote,
        ),
      if (_canDebit)
        FalconButton(
          label: 'Debit note',
          ghost: true,
          onPressed: _busy ? null : _debitNote,
        ),
    ];

    return Column(
      children: [
        for (var i = 0; i < actions.length; i += 2)
          Padding(
            padding: EdgeInsets.only(bottom: i + 2 < actions.length ? 10 : 0),
            child: Row(
              children: [
                Expanded(child: actions[i]),
                if (i + 1 < actions.length) ...[
                  const SizedBox(width: 10),
                  Expanded(child: actions[i + 1]),
                ],
              ],
            ),
          ),
      ],
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
