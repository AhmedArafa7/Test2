"""
Voice utilities for Baytology.

Transcribes uploaded audio with faster-whisper, optimized for Arabic speech.
The Whisper model is loaded lazily on the first transcription request so the
chatbot API can still start and serve text endpoints while voice dependencies
are being installed or configured.
"""

from __future__ import annotations

import os
import tempfile
import threading

from config import settings


SUPPORTED_AUDIO_TYPES = {
    "audio/webm",
    "audio/wav",
    "audio/wave",
    "audio/x-wav",
    "audio/mp3",
    "audio/mpeg",
    "audio/ogg",
    "audio/flac",
    "audio/mp4",
    "audio/x-m4a",
}

_model = None
_model_lock = threading.Lock()


def transcribe_audio(audio_bytes: bytes, mime_type: str) -> str:
    """
    Transcribe audio bytes to Arabic text.

    Args:
        audio_bytes: Raw uploaded audio bytes.
        mime_type: Normalized audio MIME type.

    Returns:
        Transcribed text.

    Raises:
        ValueError: When the audio is empty or no speech is detected.
        RuntimeError: When faster-whisper is not installed/configured.
    """
    if not audio_bytes:
        raise ValueError("Empty audio file")

    ext = _mime_to_extension(mime_type)

    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        model = _get_model()
        segments, info = model.transcribe(
            tmp_path,
            language="ar",
            beam_size=settings.whisper_beam_size,
            vad_filter=True,
        )

        transcription = " ".join(segment.text.strip() for segment in segments).strip()

        if not transcription:
            raise ValueError("Transcription returned empty result; no speech detected")

        print(
            "[VOICE] Detected language: "
            f"{info.language} (prob: {info.language_probability:.2f})"
        )
        return transcription
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


def validate_audio_type(content_type: str | None) -> str:
    """
    Validate and normalize an uploaded audio MIME type.
    """
    if not content_type:
        return "audio/webm"

    normalized = content_type.lower().strip()
    base_type = normalized.split(";")[0].strip()

    if base_type in SUPPORTED_AUDIO_TYPES:
        return base_type

    supported = ", ".join(sorted(SUPPORTED_AUDIO_TYPES))
    raise ValueError(
        f"Unsupported audio type: '{content_type}'. Supported types: {supported}"
    )


def _get_model():
    global _model

    if _model is not None:
        return _model

    with _model_lock:
        if _model is not None:
            return _model

        try:
            from faster_whisper import WhisperModel
        except ImportError as exc:
            raise RuntimeError(
                "Voice recognition requires faster-whisper. "
                "Install it with: pip install faster-whisper"
            ) from exc

        print(
            "[VOICE] Loading Whisper model "
            f"'{settings.whisper_model}' on {settings.whisper_device}..."
        )
        _model = WhisperModel(
            settings.whisper_model,
            device=settings.whisper_device,
            compute_type=settings.whisper_compute_type,
        )
        print("[VOICE] Whisper model loaded successfully.")
        return _model


def _mime_to_extension(mime_type: str) -> str:
    mapping = {
        "audio/webm": ".webm",
        "audio/wav": ".wav",
        "audio/wave": ".wav",
        "audio/x-wav": ".wav",
        "audio/mp3": ".mp3",
        "audio/mpeg": ".mp3",
        "audio/ogg": ".ogg",
        "audio/flac": ".flac",
        "audio/mp4": ".mp4",
        "audio/x-m4a": ".m4a",
    }

    base_type = mime_type.lower().split(";")[0].strip()
    return mapping.get(base_type, ".webm")
