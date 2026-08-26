// Background removal for the Dashboard Zoey asset.
//
// Runs Vision's foreground-instance matte over the source and applies that matte as ALPHA to the
// source's own pixels. It repaints nothing: every colour written out is the colour that was already
// there. The only new information in the output is the alpha channel.
//
//   swiftc -O Cutout.swift -o cutout
//   ./cutout <source.png> <destination.png>

import AppKit
import CoreImage
import Foundation
import Vision

func fail(_ message: String) -> Never {
    FileHandle.standardError.write(("ERROR: " + message + "\n").data(using: .utf8)!)
    exit(1)
}

let args = CommandLine.arguments
guard args.count == 3 else { fail("usage: cutout <source.png> <destination.png>") }
let sourceURL = URL(fileURLWithPath: args[1])
let destURL = URL(fileURLWithPath: args[2])

guard let source = CIImage(contentsOf: sourceURL) else { fail("could not read \(args[1])") }
let extent = source.extent
print("  source: \(Int(extent.width))x\(Int(extent.height))")

let handler = VNImageRequestHandler(ciImage: source, options: [:])
let request = VNGenerateForegroundInstanceMaskRequest()

do {
    try handler.perform([request])
} catch {
    fail("Vision could not run the foreground request: \(error.localizedDescription)")
}

guard let result = request.results?.first else {
    fail("Vision found no foreground instance to lift")
}
print("  foreground instances found: \(result.allInstances.count)")

// croppedToInstancesExtent: false -- the output must keep the source's exact bounds. Cropping here
// would silently change the asset's aspect and every layout multiplier derived from it.
let maskedBuffer: CVPixelBuffer
do {
    maskedBuffer = try result.generateMaskedImage(
        ofInstances: result.allInstances,
        from: handler,
        croppedToInstancesExtent: false
    )
} catch {
    fail("could not generate the masked image: \(error.localizedDescription)")
}

let masked = CIImage(cvPixelBuffer: maskedBuffer)
guard masked.extent.width == extent.width, masked.extent.height == extent.height else {
    fail("Vision returned \(Int(masked.extent.width))x\(Int(masked.extent.height)); expected the source bounds")
}

// Write straight (non-premultiplied) RGBA PNG so the stored colours stay the source's own.
let context = CIContext(options: [.workingColorSpace: NSNull()])
guard let colorSpace = CGColorSpace(name: CGColorSpace.sRGB) else { fail("no sRGB colour space") }

do {
    try context.writePNGRepresentation(
        of: masked,
        to: destURL,
        format: .RGBA8,
        colorSpace: colorSpace,
        options: [:]
    )
} catch {
    fail("could not write \(args[2]): \(error.localizedDescription)")
}

print("  wrote \(args[2])")
