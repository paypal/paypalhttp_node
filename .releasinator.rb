configatron.product_name = "BraintreeHttp Node"

# Custom validations
def test
  tag = Time.now.to_i
  _test_with_dockerfile(tag)
end

def _test_with_dockerfile(tag)
  CommandProcessor.command("docker build -t #{tag} .")
  CommandProcessor.command("docker run #{tag}", live_output=true)
end

def package_version
	/braintreehttp: '(\d+\.\d+\.\d+)'/.match(`npm version`)[1]
end

def validate_version_match
	if package_version != @current_release.version
		Printer.fail("package version #{package_version} does not match changelog version #{@current_release.version}.")
		abort()
	end

	Printer.success("package version #{package_version} matches latest changelog version #{@current_release.version}.")
end

configatron.custom_validation_methods = [
	method(:validate_version_match),
  method(:test)
]

# Build, update version, and publish to NPM
def build_method
	# noop
end

configatron.build_method = method(:build_method)

def update_version_method(version, semver_type)
	CommandProcessor.command("npm version --no-git-tag-version #{semver_type}")
end

configatron.update_version_method = method(:update_version_method)

def publish_to_package_manager(version)
	CommandProcessor.command("npm publish")
end

configatron.publish_to_package_manager_method = method(:publish_to_package_manager)

def wait_for_package_manager(version)
end

configatron.wait_for_package_manager_method = method(:wait_for_package_manager)

# Miscellania
configatron.prerelease_checklist_items = []
configatron.release_to_github = true
