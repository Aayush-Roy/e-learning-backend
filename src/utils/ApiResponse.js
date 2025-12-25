class ApiResponse {
  constructor(success, message, data = null, meta = null) {
    this.success = success;
    this.message = message;
    this.data = data;
    this.meta = meta;
    this.timestamp = new Date().toISOString();
  }

  static success(message, data = null, meta = null) {
    return new ApiResponse(true, message, data, meta);
  }

  static error(message, errors = null) {
    return new ApiResponse(false, message, null, { errors });
  }

  toJSON() {
    return {
      success: this.success,
      message: this.message,
      data: this.data,
      meta: this.meta,
      timestamp: this.timestamp
    };
  }
}

module.exports = ApiResponse;