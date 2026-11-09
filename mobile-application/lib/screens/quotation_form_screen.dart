import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../api.dart';
import '../auth.dart';
import '../theme.dart';
import '../widgets/glass.dart';

class QuotationFormScreen extends StatefulWidget {
  const QuotationFormScreen({
    super.key,
    this.documentId,
    this.docType = 'quotation',
  });

  /// When set, form loads and updates an existing quotation or invoice.
  final Object? documentId;
  final String docType;

  @override
  State<QuotationFormScreen> createState() => _QuotationFormScreenState();
}

class _LineItem {
  _LineItem();
  final description = TextEditingController();
  final quantity = TextEditingController(text: '1');
  final unitPrice = TextEditingController(text: '0');

  void dispose() {
    description.dispose();
    quantity.dispose();
    unitPrice.dispose();
  }

  double get qty => double.tryParse(quantity.text.trim()) ?? 0;
  double get price => double.tryParse(unitPrice.text.trim()) ?? 0;
  double get lineTotal => qty * price;
  bool get hasText => description.text.trim().isNotEmpty;
}

class _QuotationFormScreenState extends State<QuotationFormScreen> {
  int _step = 0;
  bool _busy = false;
  bool _loadingDoc = false;
  String? _error;

  List<Map<String, dynamic>> _customers = [];
  bool _loadingCustomers = true;
  Object? _customerId;
  bool _newCustomer = false;

  bool get _isEdit => widget.documentId != null;
  bool get _isQuotation =>
      widget.docType.toLowerCase() == 'quotation';

  final _customerName = TextEditingController();
  final _customerPhone = TextEditingController();
  final _make = TextEditingController();
  final _model = TextEditingController();
  final _year = TextEditingController();
  final _plate = TextEditingController();
  final _mileage = TextEditingController();
  final _jobOrder = TextEditingController();
  final _notes = TextEditingController();
  final _discount = TextEditingController(text: '0');
  late String _issueDate;
  final _items = <_LineItem>[_LineItem()];

  static const _steps = ['Customer', 'Vehicle', 'Lines'];

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _issueDate =
        '${now.year.toString().padLeft(4, '0')}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
    _loadCustomers();
    if (_isEdit) _loadDocument();
  }

  Future<void> _loadDocument() async {
    setState(() => _loadingDoc = true);
    try {
      final doc =
          await Api(context.read<AuthStore>()).getInvoice(widget.documentId!);
      if (!mounted) return;
      for (final item in _items) {
        item.dispose();
      }
      _items.clear();
      final rawItems = List<dynamic>.from(doc['items'] as List? ?? []);
      if (rawItems.isEmpty) {
        _items.add(_LineItem());
      } else {
        for (final raw in rawItems) {
          final row = Map<String, dynamic>.from(raw as Map);
          final line = _LineItem();
          line.description.text = (row['description'] ?? '').toString();
          line.quantity.text = (row['quantity'] ?? 1).toString();
          line.unitPrice.text = (row['unit_price'] ?? 0).toString();
          _items.add(line);
        }
      }
      setState(() {
        _customerId = doc['customer_id'];
        _customerPhone.text = (doc['customer_phone'] ?? '').toString();
        _make.text = (doc['vehicle_make'] ?? '').toString();
        _model.text = (doc['vehicle_model'] ?? '').toString();
        _year.text = (doc['vehicle_year'] ?? '').toString();
        _plate.text = (doc['vehicle_plate'] ?? '').toString();
        _mileage.text = (doc['mileage'] ?? '').toString();
        _jobOrder.text = (doc['job_order_no'] ?? '').toString();
        _notes.text = (doc['notes'] ?? '').toString();
        _discount.text = (doc['discount'] ?? 0).toString();
        _issueDate = (doc['issue_date'] ?? _issueDate).toString().split('T').first;
        _newCustomer = false;
        _loadingDoc = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loadingDoc = false;
      });
    }
  }

  @override
  void dispose() {
    _customerName.dispose();
    _customerPhone.dispose();
    _make.dispose();
    _model.dispose();
    _year.dispose();
    _plate.dispose();
    _mileage.dispose();
    _jobOrder.dispose();
    _notes.dispose();
    _discount.dispose();
    for (final item in _items) {
      item.dispose();
    }
    super.dispose();
  }

  Future<void> _loadCustomers() async {
    setState(() => _loadingCustomers = true);
    try {
      final rows = await Api(context.read<AuthStore>()).getCustomers();
      if (!mounted) return;
      setState(() {
        _customers = rows
            .map((e) => Map<String, dynamic>.from(e as Map))
            .toList()
          ..sort((a, b) => (a['name'] ?? '')
              .toString()
              .toLowerCase()
              .compareTo((b['name'] ?? '').toString().toLowerCase()));
        _loadingCustomers = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loadingCustomers = false;
      });
    }
  }

  double get _subtotal =>
      _items.where((i) => i.hasText).fold(0.0, (s, i) => s + i.lineTotal);

  double get _discountValue => double.tryParse(_discount.text.trim()) ?? 0;

  double get _taxable {
    final d = _discountValue;
    return (_subtotal - d).clamp(0, double.infinity);
  }

  double get _vat => _taxable * 0.05;
  double get _total => _taxable + _vat;

  bool _validateStep() {
    setState(() => _error = null);
    if (_step == 0) {
      if (_newCustomer) {
        if (_customerName.text.trim().isEmpty) {
          setState(() => _error = 'Customer name is required.');
          return false;
        }
      } else if (_customerId == null) {
        setState(() => _error = 'Pick a customer or create a new one.');
        return false;
      }
    }
    if (_step == 2) {
      final lines = _items.where((i) => i.hasText).toList();
      if (lines.isEmpty) {
        setState(() => _error = 'Add at least one line item.');
        return false;
      }
    }
    return true;
  }

  Future<void> _pickDate() async {
    final initial = DateTime.tryParse(_issueDate) ?? DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(2020),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked == null) return;
    setState(() {
      _issueDate =
          '${picked.year.toString().padLeft(4, '0')}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}';
    });
  }

  Future<void> _submit() async {
    if (!_validateStep()) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final api = Api(context.read<AuthStore>());
      final auth = context.read<AuthStore>().user;
      Object customerId = _customerId ?? '';
      if (_newCustomer) {
        final created = await api.createCustomer({
          'name': _customerName.text.trim(),
          'phone': _customerPhone.text.trim().isEmpty
              ? null
              : _customerPhone.text.trim(),
        });
        customerId = created['id'];
      }

      final items = _items
          .where((i) => i.hasText)
          .map((i) => {
                'description': i.description.text.trim(),
                'item_type': 'service',
                'unit': 'Job',
                'quantity': i.qty,
                'unit_price': i.price,
                'vat_rate': 5,
              })
          .toList();

      final body = {
        'customer_id': customerId,
        'customer_phone': _customerPhone.text.trim().isEmpty
            ? null
            : _customerPhone.text.trim(),
        'vehicle_make': _make.text.trim().isEmpty ? null : _make.text.trim(),
        'vehicle_model':
            _model.text.trim().isEmpty ? null : _model.text.trim(),
        'vehicle_year': _year.text.trim().isEmpty ? null : _year.text.trim(),
        'vehicle_plate':
            _plate.text.trim().isEmpty ? null : _plate.text.trim(),
        'mileage':
            _mileage.text.trim().isEmpty ? null : _mileage.text.trim(),
        'job_order_no':
            _jobOrder.text.trim().isEmpty ? null : _jobOrder.text.trim(),
        'issue_date': _issueDate,
        'status': 'sent',
        'notes': _notes.text.trim().isEmpty ? null : _notes.text.trim(),
        'prepared_by': auth?.name,
        'tax_rate': 5,
        'discount': _discountValue,
        'items': items,
      };

      if (_isEdit) {
        await api.updateInvoice(widget.documentId!, body);
      } else if (_isQuotation) {
        await api.createQuotation(body);
      } else {
        await api.createInvoice(body);
      }

      if (!mounted) return;
      Navigator.pop(context, true);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return GlassBackground(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          foregroundColor: FalconColors.ink,
          title: Text(
            _isEdit
                ? (_isQuotation ? 'Edit quotation' : 'Edit invoice')
                : (_isQuotation ? 'New quotation' : 'New invoice'),
            style: const TextStyle(fontWeight: FontWeight.w800),
          ),
        ),
        body: SafeArea(
          child: _loadingDoc
              ? const Center(child: CircularProgressIndicator())
              : Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                child: Row(
                  children: List.generate(_steps.length, (i) {
                    final on = i == _step;
                    final done = i < _step;
                    return Expanded(
                      child: Padding(
                        padding: EdgeInsets.only(right: i < 2 ? 8 : 0),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          decoration: BoxDecoration(
                            color: on || done
                                ? FalconColors.ink
                                : Colors.white.withValues(alpha: 0.45),
                            borderRadius: BorderRadius.circular(999),
                            border: Border.all(color: FalconColors.line),
                          ),
                          child: Text(
                            '${i + 1}. ${_steps[i]}',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: on || done
                                  ? Colors.white
                                  : FalconColors.muted,
                              fontWeight: FontWeight.w700,
                              fontSize: 12.5,
                            ),
                          ),
                        ),
                      ),
                    );
                  }),
                ),
              ),
              if (_error != null)
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                  child: Text(_error!,
                      style: const TextStyle(color: FalconColors.danger)),
                ),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 20),
                  children: [
                    if (_step == 0) _customerStep(),
                    if (_step == 1) _vehicleStep(),
                    if (_step == 2) _linesStep(),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                child: Row(
                  children: [
                    if (_step > 0)
                      Expanded(
                        child: FalconButton(
                          label: 'Back',
                          ghost: true,
                          onPressed: _busy
                              ? null
                              : () => setState(() => _step -= 1),
                        ),
                      ),
                    if (_step > 0) const SizedBox(width: 10),
                    Expanded(
                      flex: 2,
                      child: FalconButton(
                        label: _step < 2
                            ? 'Continue'
                            : (_busy
                                ? 'Saving…'
                                : (_isEdit
                                    ? 'Save changes'
                                    : (_isQuotation
                                        ? 'Save quotation'
                                        : 'Save invoice'))),
                        onPressed: _busy
                            ? null
                            : () {
                                if (!_validateStep()) return;
                                if (_step < 2) {
                                  setState(() => _step += 1);
                                } else {
                                  _submit();
                                }
                              },
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _customerStep() {
    return GlassCard(
      strong: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Who is this for?',
              style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
          const SizedBox(height: 4),
          const Text('Choose an existing client or add a new one.',
              style: TextStyle(color: FalconColors.muted)),
          const SizedBox(height: 14),
          Row(
            children: [
              ChoiceChip(
                label: const Text('Existing'),
                selected: !_newCustomer,
                onSelected: (_) => setState(() => _newCustomer = false),
                selectedColor: FalconColors.ink,
                labelStyle: TextStyle(
                  color: !_newCustomer ? Colors.white : FalconColors.muted,
                  fontWeight: FontWeight.w600,
                ),
                showCheckmark: false,
              ),
              const SizedBox(width: 8),
              ChoiceChip(
                label: const Text('New client'),
                selected: _newCustomer,
                onSelected: (_) => setState(() {
                  _newCustomer = true;
                  _customerId = null;
                }),
                selectedColor: FalconColors.ink,
                labelStyle: TextStyle(
                  color: _newCustomer ? Colors.white : FalconColors.muted,
                  fontWeight: FontWeight.w600,
                ),
                showCheckmark: false,
              ),
            ],
          ),
          const SizedBox(height: 14),
          if (!_newCustomer) ...[
            if (_loadingCustomers)
              const Padding(
                padding: EdgeInsets.all(24),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (_customers.isEmpty)
              const EmptyHint(
                title: 'No customers yet',
                body: 'Switch to New client to add the first one.',
              )
            else
              ConstrainedBox(
                constraints: const BoxConstraints(maxHeight: 280),
                child: ListView.separated(
                  shrinkWrap: true,
                  itemCount: _customers.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 8),
                  itemBuilder: (context, index) {
                    final c = _customers[index];
                    final selected = _customerId == c['id'];
                    final phone = c['phone']?.toString() ?? '';
                    return Material(
                      color: Colors.transparent,
                      child: InkWell(
                        borderRadius: BorderRadius.circular(16),
                        onTap: () => setState(() {
                          _customerId = c['id'];
                          _customerPhone.text = phone;
                        }),
                        child: Ink(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 14, vertical: 12),
                          decoration: BoxDecoration(
                            color: selected
                                ? FalconColors.ink.withValues(alpha: 0.92)
                                : Colors.white.withValues(alpha: 0.4),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: selected
                                  ? Colors.transparent
                                  : Colors.white.withValues(alpha: 0.55),
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                (c['name'] ?? 'Customer').toString(),
                                style: TextStyle(
                                  fontWeight: FontWeight.w700,
                                  color: selected
                                      ? Colors.white
                                      : FalconColors.ink,
                                ),
                              ),
                              if (phone.isNotEmpty)
                                Text(
                                  phone,
                                  style: TextStyle(
                                    color: selected
                                        ? Colors.white70
                                        : FalconColors.muted,
                                    fontSize: 13,
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
          ] else ...[
            TextField(
              controller: _customerName,
              textCapitalization: TextCapitalization.words,
              decoration: glassFieldDecoration('Customer name'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _customerPhone,
              keyboardType: TextInputType.phone,
              decoration: glassFieldDecoration('Phone (optional)'),
            ),
          ],
        ],
      ),
    );
  }

  Widget _vehicleStep() {
    return GlassCard(
      strong: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Vehicle & job',
              style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
          const SizedBox(height: 4),
          const Text('Optional details — fill what you know.',
              style: TextStyle(color: FalconColors.muted)),
          const SizedBox(height: 14),
          TextField(
            controller: _make,
            textCapitalization: TextCapitalization.words,
            decoration: glassFieldDecoration('Make'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _model,
            textCapitalization: TextCapitalization.words,
            decoration: glassFieldDecoration('Model'),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _year,
                  keyboardType: TextInputType.number,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  decoration: glassFieldDecoration('Year'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: TextField(
                  controller: _plate,
                  textCapitalization: TextCapitalization.characters,
                  decoration: glassFieldDecoration('Plate'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _mileage,
                  decoration: glassFieldDecoration('Mileage'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: TextField(
                  controller: _jobOrder,
                  decoration: glassFieldDecoration('Job order #'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          InkWell(
            onTap: _pickDate,
            borderRadius: BorderRadius.circular(16),
            child: InputDecorator(
              decoration: glassFieldDecoration('Issue date'),
              child: Text(_issueDate,
                  style: const TextStyle(fontWeight: FontWeight.w600)),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _notes,
            maxLines: 3,
            decoration: glassFieldDecoration('Notes (optional)'),
          ),
        ],
      ),
    );
  }

  Widget _linesStep() {
    return Column(
      children: [
        GlassCard(
          strong: true,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Expanded(
                    child: Text('Line items',
                        style: TextStyle(
                            fontWeight: FontWeight.w800, fontSize: 18)),
                  ),
                  TextButton.icon(
                    onPressed: _items.length >= 12
                        ? null
                        : () => setState(() => _items.add(_LineItem())),
                    icon: const Icon(Icons.add_rounded, size: 18),
                    label: const Text('Add'),
                  ),
                ],
              ),
              const Text('Description, quantity, and unit price.',
                  style: TextStyle(color: FalconColors.muted)),
              const SizedBox(height: 10),
              ...List.generate(_items.length, (index) {
                final item = _items[index];
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.35),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                          color: Colors.white.withValues(alpha: 0.55)),
                    ),
                    child: Column(
                      children: [
                        Row(
                          children: [
                            Text('Item ${index + 1}',
                                style: const TextStyle(
                                    fontWeight: FontWeight.w700)),
                            const Spacer(),
                            if (_items.length > 1)
                              IconButton(
                                visualDensity: VisualDensity.compact,
                                onPressed: () => setState(() {
                                  _items.removeAt(index).dispose();
                                }),
                                icon: const Icon(Icons.close_rounded,
                                    size: 18),
                              ),
                          ],
                        ),
                        TextField(
                          controller: item.description,
                          textCapitalization: TextCapitalization.sentences,
                          decoration:
                              glassFieldDecoration('Description'),
                          onChanged: (_) => setState(() {}),
                        ),
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            Expanded(
                              child: TextField(
                                controller: item.quantity,
                                keyboardType:
                                    const TextInputType.numberWithOptions(
                                        decimal: true),
                                decoration: glassFieldDecoration('Qty'),
                                onChanged: (_) => setState(() {}),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              flex: 2,
                              child: TextField(
                                controller: item.unitPrice,
                                keyboardType:
                                    const TextInputType.numberWithOptions(
                                        decimal: true),
                                decoration:
                                    glassFieldDecoration('Unit price'),
                                onChanged: (_) => setState(() {}),
                              ),
                            ),
                          ],
                        ),
                        if (item.hasText) ...[
                          const SizedBox(height: 8),
                          Align(
                            alignment: Alignment.centerRight,
                            child: Text(
                              money(item.lineTotal),
                              style: const TextStyle(
                                  fontWeight: FontWeight.w800),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                );
              }),
              TextField(
                controller: _discount,
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                decoration: glassFieldDecoration('Discount (AED)'),
                onChanged: (_) => setState(() {}),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        GlassCard(
          child: Column(
            children: [
              _sumRow('Subtotal', money(_subtotal)),
              _sumRow('Discount', '- ${money(_discountValue)}'),
              _sumRow('VAT 5%', money(_vat)),
              const Divider(height: 20),
              _sumRow('Total', money(_total), strong: true),
              const SizedBox(height: 6),
              Text(
                _isQuotation
                    ? 'After saving, open the quotation and tap Generate invoice.'
                    : 'Save to update this tax invoice.',
                style: const TextStyle(
                    color: FalconColors.muted, fontSize: 12.5),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _sumRow(String label, String value, {bool strong = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        children: [
          Expanded(
            child: Text(label,
                style: TextStyle(
                  color: strong ? FalconColors.ink : FalconColors.muted,
                  fontWeight: strong ? FontWeight.w800 : FontWeight.w500,
                )),
          ),
          Text(value,
              style: TextStyle(
                fontWeight: strong ? FontWeight.w800 : FontWeight.w700,
                fontSize: strong ? 17 : 14,
              )),
        ],
      ),
    );
  }
}
