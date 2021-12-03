module.exports = {
	apps: [
		{
			name: "nodejsbot",
			script: "test2.js",
			cwd: "./",
			autorestart: false,
			max_restarts: 5,
			min_uptime: "10s",
			restart_delay: 5000,
			out_file: "logs/normal.log",
			error_file: "logs/error.log",
			combine_logs: true,
			kill_timeout: 10000,
			shutdown_with_message: true,
		},
	],
};
