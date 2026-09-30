<?php
declare(strict_types=1);

/**
 * ApiResponse
 * 
 * Object-oriented response utility for REST API JSON output.
 */
class ApiResponse
{
    /**
     * Send JSON response and exit.
     */
    public static function send(mixed $data, int $status = 200): void
    {
        if (!headers_sent()) {
            header("Content-Type: application/json; charset=UTF-8");
            http_response_code($status);
        }
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit;
    }

    /**
     * Send standard success response.
     */
    public static function success(mixed $data = null, string $message = ''): void
    {
        $payload = ['success' => true];
        if ($message !== '') {
            $payload['message'] = $message;
        }
        if ($data !== null) {
            $payload['data'] = $data;
        }
        self::send($payload, 200);
    }

    /**
     * Send standard error response.
     */
    public static function error(string $message, int $status = 400): void
    {
        self::send([
            'success' => false,
            'error' => $message
        ], $status);
    }
}
