from pathlib import Path
import sys

import argostranslate.package


sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.translator import SUPPORTED_PAIRS, get_installed_pairs  # noqa: E402


def install_language_packages() -> None:
    argostranslate.package.update_package_index()
    available_packages = argostranslate.package.get_available_packages()
    installed_pairs = get_installed_pairs()

    for source_code, target_code in SUPPORTED_PAIRS:
        if (source_code, target_code) in installed_pairs:
            print("Argos package already installed: " + source_code + " -> " + target_code)
            continue

        package_to_install = next(
            (
                package
                for package in available_packages
                if package.from_code == source_code and package.to_code == target_code
            ),
            None,
        )

        if package_to_install is None:
            raise RuntimeError(
                "No Argos package found: " + source_code + " -> " + target_code
            )

        print("Installing Argos package: " + source_code + " -> " + target_code)
        download_path = package_to_install.download()
        argostranslate.package.install_from_path(download_path)


if __name__ == "__main__":
    install_language_packages()
