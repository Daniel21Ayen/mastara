// apps/mobile/modules/mastara-clock/android/src/main/java/expo/modules/mastaraclock/MastaraClockModule.kt
package expo.modules.mastaraclock

import android.os.SystemClock
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Exam clock that the student cannot move.
 * - elapsedRealtimeMs: milliseconds since the phone started, INCLUDING time spent asleep. Unaffected by the date and time settings.
 * - bootId: changes at every restart (Android boot count). Empty when the phone does not report it.
 */
class MastaraClockModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("MastaraClock")

    Function("elapsedRealtimeMs") {
      SystemClock.elapsedRealtime().toDouble()
    }

    Function("bootId") {
      val context = appContext.reactContext ?: return@Function ""
      val count = Settings.Global.getInt(context.contentResolver, Settings.Global.BOOT_COUNT, -1)
      if (count < 0) "" else count.toString()
    }
  }
}
