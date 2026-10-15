// apps/mobile/modules/mastara-clock/ios/MastaraClockModule.swift
import ExpoModulesCore
import Darwin

/// Exam clock that the student cannot move. mach_continuous_time keeps counting while the phone sleeps and
/// ignores the date and time settings. iOS has no trustworthy restart counter, so bootId is empty.
public class MastaraClockModule: Module {
  public func definition() -> ModuleDefinition {
    Name("MastaraClock")

    Function("elapsedRealtimeMs") { () -> Double in
      var info = mach_timebase_info_data_t()
      mach_timebase_info(&info)
      let nanoseconds = Double(mach_continuous_time()) * Double(info.numer) / Double(info.denom)
      return nanoseconds / 1_000_000.0
    }

    Function("bootId") { () -> String in
      return ""
    }
  }
}
