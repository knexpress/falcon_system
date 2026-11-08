import 'package:flutter_test/flutter_test.dart';
import 'package:falcon_revive/auth.dart';
import 'package:falcon_revive/main.dart';

void main() {
  testWidgets('Falcon app boots to login', (tester) async {
    final auth = AuthStore()..ready = true;
    await tester.pumpWidget(FalconReviveApp(auth: auth));
    await tester.pump();
    expect(find.text('Falcon Revive'), findsOneWidget);
  });
}
