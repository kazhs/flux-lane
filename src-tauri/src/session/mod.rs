//! セッション ID (UUID) と WKWebsiteDataStore の `data_store_identifier` (16 bytes) の変換ユーティリティ。
//!
//! macOS 前提: 実際のデータ分離は `WebviewBuilder::data_store_identifier`（macOS 14+ / iOS 17+）が
//! 担う。ここでは UUID 文字列 <-> [u8; 16] の変換のみを持つ薄い関数として切り出す。
//! Windows 対応時は WebView2 のユーザーデータフォルダ分離実装をこのモジュール配下に追加し、
//! `SessionBackend` trait で抽象化する想定（TS 層は `sessionId` 文字列しか知らないため無変更で移植可能）。

use uuid::Uuid;

/// UUID 文字列を `data_store_identifier` に渡す 16 bytes に変換する。
pub fn session_id_to_data_store_identifier(session_id: &str) -> Result<[u8; 16], String> {
    let uuid = Uuid::parse_str(session_id)
        .map_err(|e| format!("invalid session_id (expected UUID): {e}"))?;
    Ok(uuid.into_bytes())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn converts_valid_uuid() {
        let bytes =
            session_id_to_data_store_identifier("550e8400-e29b-41d4-a716-446655440000").unwrap();
        assert_eq!(
            bytes,
            [
                0x55, 0x0e, 0x84, 0x00, 0xe2, 0x9b, 0x41, 0xd4, 0xa7, 0x16, 0x44, 0x66, 0x55, 0x44,
                0x00, 0x00
            ]
        );
    }

    #[test]
    fn rejects_invalid_uuid() {
        assert!(session_id_to_data_store_identifier("not-a-uuid").is_err());
    }
}
