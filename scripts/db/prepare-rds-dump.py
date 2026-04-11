#!/usr/bin/env python3

"""Prepara un dump MySQL para importacion en AWS RDS.

Acciones:
- Conserva un raw dump sin modificar.
- Genera dump limpio para RDS removiendo:
  - CREATE DATABASE ...
  - USE ...
  - bloques de VIEW invalidos del tipo:
    DROP TABLE IF EXISTS ...
    CREATE VIEW ... AS
    ;
"""

from pathlib import Path

RAW_DUMP = Path('database/dumps/raw/Publicacion_backup_2026.sql')
RDS_DUMP = Path('database/dumps/aws-rds/rais-full-backup-2026.rds.sql')


def should_drop_header(line: str) -> bool:
    stripped = line.strip()
    return stripped.startswith('CREATE DATABASE IF NOT EXISTS `') or stripped.startswith('USE `')


def main() -> None:
    if not RAW_DUMP.exists():
        raise SystemExit(f'Raw dump not found: {RAW_DUMP}')

    removed_header_lines = 0
    removed_view_blocks = 0

    with RAW_DUMP.open('r', encoding='utf-8', errors='replace') as fin, RDS_DUMP.open('w', encoding='utf-8') as fout:
        iterator = iter(fin)
        for line in iterator:
            if should_drop_header(line):
                removed_header_lines += 1
                continue

            if line.startswith('-- Eliminando tabla temporal y crear estructura final de VIEW'):
                next_lines = []
                try:
                    next_lines.append(next(iterator))
                    next_lines.append(next(iterator))
                    next_lines.append(next(iterator))
                except StopIteration:
                    fout.write(line)
                    for extra in next_lines:
                        fout.write(extra)
                    break

                drop_line, create_line, terminator_line = next_lines
                if (
                    drop_line.startswith('DROP TABLE IF EXISTS `')
                    and create_line.startswith('CREATE VIEW `')
                    and ' AS' in create_line
                    and terminator_line.strip() == ';'
                ):
                    removed_view_blocks += 1
                    continue

                fout.write(line)
                fout.write(drop_line)
                fout.write(create_line)
                fout.write(terminator_line)
                continue

            fout.write(line)

    print('RDS dump generated successfully')
    print(f'raw file: {RAW_DUMP}')
    print(f'rds file: {RDS_DUMP}')
    print(f'removed header lines: {removed_header_lines}')
    print(f'removed invalid view blocks: {removed_view_blocks}')


if __name__ == '__main__':
    main()
