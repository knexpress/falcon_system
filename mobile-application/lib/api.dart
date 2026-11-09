import 'dart:convert';
import 'dart:typed_data';
import 'package:http/http.dart' as http;
import 'auth.dart';

/// Override with --dart-define=API_URL=... for local/dev.
const String kApiBase = String.fromEnvironment(
  'API_URL',
  defaultValue: 'https://falcon-system-vjgr.onrender.com',
);

class ApiException implements Exception {
  ApiException(this.message);
  final String message;
  @override
  String toString() => message;
}

class Api {
  Api(this.auth);
  final AuthStore auth;

  Uri _uri(String path, [Map<String, String>? query]) {
    final base = kApiBase.replaceAll(RegExp(r'/$'), '');
    return Uri.parse('$base/api$path').replace(queryParameters: query);
  }

  Map<String, String> _headers() {
    final h = <String, String>{'Content-Type': 'application/json'};
    final user = auth.user;
    if (user != null) {
      h['X-Falcon-User'] = user.username;
      h['X-Falcon-Name'] = user.name;
      h['X-Falcon-Role'] = user.role;
    }
    return h;
  }

  Future<dynamic> _request(
    String method,
    String path, {
    Map<String, String>? query,
    Object? body,
  }) async {
    late http.Response res;
    try {
      final uri = _uri(path, query);
      final headers = _headers();
      final encoded = body == null ? null : jsonEncode(body);
      switch (method) {
        case 'GET':
          res = await http.get(uri, headers: headers);
          break;
        case 'POST':
          res = await http.post(uri, headers: headers, body: encoded);
          break;
        case 'PUT':
          res = await http.put(uri, headers: headers, body: encoded);
          break;
        case 'DELETE':
          res = await http.delete(uri, headers: headers, body: encoded);
          break;
        default:
          throw ApiException('Unsupported method $method');
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException(
        'Cannot reach API at $kApiBase ($e). '
        'For emulator run: adb reverse tcp:4000 tcp:4000 '
        'then --dart-define=API_URL=http://127.0.0.1:4000',
      );
    }

    dynamic data = {};
    if (res.body.isNotEmpty) {
      try {
        data = jsonDecode(res.body);
      } catch (_) {
        data = {'raw': res.body};
      }
    }
    if (res.statusCode < 200 || res.statusCode >= 300) {
      final msg = data is Map
          ? (data['error'] ?? data['detail'] ?? 'Request failed (${res.statusCode})')
          : 'Request failed (${res.statusCode})';
      throw ApiException(msg.toString());
    }
    return data;
  }

  Future<Map<String, dynamic>> login(String username, String password) async {
    final data = await _request('POST', '/auth/login', body: {
      'username': username,
      'password': password,
    });
    return Map<String, dynamic>.from(data as Map);
  }

  Future<Map<String, dynamic>> getProfile() async {
    final data = await _request('GET', '/auth/me');
    return Map<String, dynamic>.from(data as Map);
  }

  Future<Map<String, dynamic>> updateProfile(Map<String, dynamic> body) async {
    final data = await _request('PUT', '/auth/profile', body: body);
    return Map<String, dynamic>.from(data as Map);
  }

  Future<Map<String, dynamic>> getDashboard() async {
    final data = await _request('GET', '/dashboard');
    return Map<String, dynamic>.from(data as Map);
  }

  Future<List<dynamic>> getPendingApprovals() async {
    final data = await _request('GET', '/invoices/pending-approvals');
    return List<dynamic>.from(data as List);
  }

  Future<Map<String, dynamic>> getInvoice(Object id) async {
    final data = await _request('GET', '/invoices/$id');
    return Map<String, dynamic>.from(data as Map);
  }

  Future<Uint8List> getInvoicePdf(Object id) async {
    late http.Response res;
    try {
      res = await http.get(_uri('/invoices/$id/pdf'), headers: _headers());
    } catch (e) {
      throw ApiException(
        'Cannot reach API at $kApiBase ($e). '
        'For emulator run: adb reverse tcp:4000 tcp:4000 '
        'then --dart-define=API_URL=http://127.0.0.1:4000',
      );
    }
    if (res.statusCode < 200 || res.statusCode >= 300) {
      String msg = 'PDF failed (${res.statusCode})';
      try {
        final data = jsonDecode(res.body);
        if (data is Map && data['error'] != null) {
          msg = data['error'].toString();
        }
      } catch (_) {}
      throw ApiException(msg);
    }
    if (res.bodyBytes.isEmpty) {
      throw ApiException('PDF response was empty.');
    }
    return res.bodyBytes;
  }

  Future<void> approveInvoice(Object id) =>
      _request('POST', '/invoices/$id/approve', body: {});

  Future<void> sendBackQuotation(Object id, String note) =>
      _request('POST', '/invoices/$id/send-back', body: {'note': note});

  Future<List<dynamic>> getQuotations() async {
    final data = await _request('GET', '/invoices', query: {
      'doc_type': 'quotation',
    });
    return List<dynamic>.from(data as List);
  }

  Future<List<dynamic>> getInvoices() async {
    final data = await _request('GET', '/invoices', query: {
      'doc_type': 'invoice_board',
    });
    return List<dynamic>.from(data as List);
  }

  Future<List<dynamic>> getVehicles() async {
    final data = await _request('GET', '/vehicles');
    return List<dynamic>.from(data as List);
  }

  Future<List<dynamic>> getInventory() async {
    final data = await _request('GET', '/inventory');
    return List<dynamic>.from(data as List);
  }

  Future<List<dynamic>> getCustomers() async {
    final data = await _request('GET', '/customers');
    return List<dynamic>.from(data as List);
  }

  Future<Map<String, dynamic>> createCustomer(Map<String, dynamic> body) async {
    final data = await _request('POST', '/customers', body: body);
    return Map<String, dynamic>.from(data as Map);
  }

  Future<Map<String, dynamic>> createQuotation(Map<String, dynamic> body) async {
    final data = await _request('POST', '/invoices', body: {
      ...body,
      'doc_type': 'quotation',
    });
    return Map<String, dynamic>.from(data as Map);
  }

  Future<Map<String, dynamic>> createInvoice(Map<String, dynamic> body) async {
    final data = await _request('POST', '/invoices', body: {
      ...body,
      'doc_type': 'invoice',
    });
    return Map<String, dynamic>.from(data as Map);
  }

  Future<Map<String, dynamic>> updateInvoice(
    Object id,
    Map<String, dynamic> body,
  ) async {
    final data = await _request('PUT', '/invoices/$id', body: body);
    return Map<String, dynamic>.from(data as Map);
  }

  /// Credit note — same as website DELETE /invoices/:id (keeps record).
  Future<Map<String, dynamic>> issueCreditNote(Object id) async {
    final data = await _request('DELETE', '/invoices/$id');
    return Map<String, dynamic>.from(data as Map);
  }

  Future<Map<String, dynamic>> issueDebitNote(Object id) async {
    final data = await _request('POST', '/invoices/$id/debit-note', body: {});
    return Map<String, dynamic>.from(data as Map);
  }

  Future<Map<String, dynamic>> generateInvoiceFromQuotation(Object id) async {
    final data =
        await _request('POST', '/invoices/$id/generate-invoice', body: {});
    return Map<String, dynamic>.from(data as Map);
  }

  Future<List<dynamic>> getSales() async {
    final data = await _request('GET', '/sales');
    return List<dynamic>.from(data as List);
  }

  Future<List<dynamic>> getExpenses() async {
    final data = await _request('GET', '/expenses');
    return List<dynamic>.from(data as List);
  }

  Future<Map<String, dynamic>> getJournal() async {
    final data = await _request('GET', '/journal');
    return Map<String, dynamic>.from(data as Map);
  }

  Future<void> registerDevice({
    required String token,
    String platform = 'android',
  }) =>
      _request('POST', '/devices/register', body: {
        'token': token,
        'platform': platform,
      });

  Future<void> unregisterDevice({String? token}) => _request(
        'DELETE',
        '/devices/register',
        body: token == null ? null : {'token': token},
      );

  Future<List<dynamic>> getUnreadAlerts() async {
    final data = await _request('GET', '/devices/alerts', query: {
      'unread': '1',
    });
    return List<dynamic>.from(data as List);
  }
}
