import argparse
import os
import struct
import tempfile
from pathlib import Path


SOURCE_RECORD = struct.Struct("<6f3B8f")
TARGET_RECORD = struct.Struct("<6f3f8f")
EXPECTED_PROPERTIES = [
    b"property float x",
    b"property float y",
    b"property float z",
    b"property float nx",
    b"property float ny",
    b"property float nz",
    b"property uchar red",
    b"property uchar green",
    b"property uchar blue",
    b"property float opacity",
    b"property float scale_0",
    b"property float scale_1",
    b"property float scale_2",
    b"property float rot_0",
    b"property float rot_1",
    b"property float rot_2",
    b"property float rot_3",
]


def convert(input_path: Path, output_path: Path) -> int:
    temporary_path = None
    try:
        with input_path.open("rb") as source:
            header_lines = []
            while True:
                line = source.readline()
                if not line:
                    raise ValueError("PLY header is missing end_header.")
                header_lines.append(line)
                if line.rstrip(b"\r\n") == b"end_header":
                    break

            header = b"".join(header_lines)
            if b"format binary_little_endian 1.0" not in header:
                raise ValueError("Expected a binary little-endian PLY.")
            properties = [
                line.rstrip(b"\r\n")
                for line in header_lines
                if line.startswith(b"property ")
            ]
            if properties != EXPECTED_PROPERTIES:
                raise ValueError(
                    "PLY properties do not match the expected Nerfstudio RGB schema."
                )

            vertex_line = next(
                (line for line in header_lines if line.startswith(b"element vertex ")),
                None,
            )
            if vertex_line is None:
                raise ValueError("PLY header is missing the vertex count.")
            vertex_count = int(vertex_line.split()[2])

            color_properties = {
                b"property uchar red": b"property float red",
                b"property uchar green": b"property float green",
                b"property uchar blue": b"property float blue",
            }
            output_header_lines = []
            for line in header_lines:
                content = line.rstrip(b"\r\n")
                replacement = color_properties.get(content)
                output_header_lines.append(
                    replacement + line[len(content):] if replacement else line
                )
            output_header = b"".join(output_header_lines)

            output_path.parent.mkdir(parents=True, exist_ok=True)
            with tempfile.NamedTemporaryFile(
                mode="wb", dir=output_path.parent, delete=False
            ) as target:
                temporary_path = Path(target.name)
                target.write(output_header)
                for _ in range(vertex_count):
                    record = source.read(SOURCE_RECORD.size)
                    if len(record) != SOURCE_RECORD.size:
                        raise ValueError("PLY vertex data ended before the declared count.")
                    values = SOURCE_RECORD.unpack(record)
                    normalized_rgb = tuple(channel / 255.0 for channel in values[6:9])
                    target.write(
                        TARGET_RECORD.pack(*values[:6], *normalized_rgb, *values[9:])
                    )
                if source.read(1):
                    raise ValueError("PLY contains unexpected data after its vertices.")

        os.replace(temporary_path, output_path)
        return vertex_count
    finally:
        if temporary_path is not None and temporary_path.exists():
            temporary_path.unlink()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Normalize Nerfstudio uchar RGB fields for GaussianSplats3D."
    )
    parser.add_argument("input", type=Path, help="Nerfstudio RGB PLY export")
    parser.add_argument("output", type=Path, help="Browser-ready PLY destination")
    args = parser.parse_args()

    count = convert(args.input, args.output)
    print(f"Converted {count:,} Gaussian splats to normalized float RGB.")


if __name__ == "__main__":
    main()
