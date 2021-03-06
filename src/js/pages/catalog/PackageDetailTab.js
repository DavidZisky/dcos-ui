import classNames from "classnames";
import qs from "query-string";
import mixin from "reactjs-mixin";
import { Link, routerShape } from "react-router";
/* eslint-disable no-unused-vars */
import React from "react";
/* eslint-enable no-unused-vars */
import { StoreMixin } from "mesosphere-shared-reactjs";
import { Dropdown, Tooltip, Modal } from "reactjs-components";

import Icon from "#SRC/js/components/Icon";
import Breadcrumb from "../../components/Breadcrumb";
import BreadcrumbTextContent from "../../components/BreadcrumbTextContent";
import CosmosPackagesStore from "../../stores/CosmosPackagesStore";
import defaultServiceImage
  from "../../../../plugins/services/src/img/icon-service-default-large@2x.png";
import Image from "../../components/Image";
import ImageViewer from "../../components/ImageViewer";
import Loader from "../../components/Loader";
import MetadataStore from "../../stores/MetadataStore";
import Page from "../../components/Page";
import RequestErrorMsg from "../../components/RequestErrorMsg";
import StringUtil from "../../utils/StringUtil";

const PackageDetailBreadcrumbs = ({ cosmosPackage }) => {
  const name = cosmosPackage.getName();
  const version = cosmosPackage.getVersion();

  const crumbs = [
    <Breadcrumb key={0} title="Catalog">
      <BreadcrumbTextContent>
        <Link to="/catalog/packages">Catalog</Link>
      </BreadcrumbTextContent>
    </Breadcrumb>,
    <Breadcrumb key={1} title={name}>
      <BreadcrumbTextContent>
        <Link to={`/catalog/packages/${name}`} query={{ version }} key={0}>
          {name}
        </Link>
      </BreadcrumbTextContent>
    </Breadcrumb>
  ];

  return <Page.Header.Breadcrumbs iconID="packages" breadcrumbs={crumbs} />;
};

const METHODS_TO_BIND = [
  "handlePackageVersionChange",
  "handleReviewAndRunClick",
  "onInstalledSuccessModalClose"
];

class PackageDetailTab extends mixin(StoreMixin) {
  constructor() {
    super(...arguments);

    this.state = {
      hasError: 0,
      isLoadingSelectedVersion: false,
      isLoadingVersions: false
    };

    this.store_listeners = [
      {
        name: "cosmosPackages",
        events: [
          "packageDescriptionError",
          "packageDescriptionSuccess",
          "listVersionsSuccess",
          "listVersionsError"
        ],
        suppressUpdate: true
      }
    ];

    METHODS_TO_BIND.forEach(method => {
      this[method] = this[method].bind(this);
    });
  }

  retrievePackageInfo(packageName, version) {
    const cosmosPackage = CosmosPackagesStore.getPackageDetails();
    const packageVersions = CosmosPackagesStore.getPackageVersions(packageName);

    // Fetch package versions if necessary
    if (packageVersions == null) {
      this.setState({ isLoadingVersions: true });

      CosmosPackagesStore.fetchPackageVersions(packageName);
    }
    // Fetch new description if name or version changed
    if (
      cosmosPackage == null ||
      packageName !== cosmosPackage.getName() ||
      version !== cosmosPackage.getVersion()
    ) {
      this.setState({ isLoadingSelectedVersion: true });

      CosmosPackagesStore.fetchPackageDescription(packageName, version);
    }
  }

  componentDidMount() {
    super.componentDidMount(...arguments);

    this.retrievePackageInfo(
      this.props.params.packageName,
      this.props.location.query.version
    );
  }

  componentWillReceiveProps(nextProps) {
    super.componentWillReceiveProps(...arguments);

    this.retrievePackageInfo(
      nextProps.params.packageName,
      nextProps.location.query.version
    );
  }

  onCosmosPackagesStorePackageDescriptionError() {
    this.setState({ hasError: true });
  }

  onCosmosPackagesStorePackageDescriptionSuccess() {
    this.setState({
      hasError: false,
      isLoadingSelectedVersion: false
    });
  }

  onCosmosPackagesStoreListVersionsSuccess() {
    this.setState({ isLoadingVersions: false });
  }

  handleReviewAndRunClick() {
    const { router } = this.context;
    const { params, location } = this.props;

    router.push(
      `/catalog/packages/${encodeURIComponent(params.packageName)}/deploy?${location.query.version}`
    );
  }

  handlePackageVersionChange(selection) {
    const query = Object.assign({}, this.props.location.query, {
      version: selection.id
    });

    global.location.replace(
      `#${this.props.location.pathname}?${qs.stringify(query)}`
    );
  }

  getErrorScreen() {
    return <RequestErrorMsg />;
  }

  getItems(definition, renderItem) {
    const items = [];
    definition.forEach((item, index) => {
      const { label, type, value } = item;

      // When there is no content to render, discard it all together
      if (!value || (Array.isArray(value) && !value.length)) {
        return null;
      }

      // If not specific type assume value is renderable
      let content = value;

      // Render sub items
      if (type === "subItems") {
        content = this.getItems(value, this.getSubItem);
      }

      items.push(renderItem(label, content, index));
    });

    return items;
  }

  getItem(label, value, key) {
    if (!label || !value) {
      return null;
    }

    if (typeof value === "string") {
      value = (
        <p className="flush">
          {value}
        </p>
      );
    }

    return (
      <div
        className="pod pod-shorter flush-top flush-right flush-left"
        key={key}
      >
        <h5 className="short-bottom">
          {label}
        </h5>
        {value}
      </div>
    );
  }

  getLoadingScreen() {
    return <Loader />;
  }

  getSubItem(label, value, key) {
    let content = value;

    if (StringUtil.isEmail(value)) {
      content = (
        <a key={key} href={`mailto:${value}`}>
          {value}
        </a>
      );
    }

    if (StringUtil.isUrl(value)) {
      content = (
        <a key={key} href={value} target="_blank">
          {value}
        </a>
      );
    }

    return (
      <p key={key} className="short">
        {`${label}: `}
        {content}
      </p>
    );
  }

  mapLicenses(licenses) {
    return licenses.map(function(license) {
      const item = {
        label: license.name,
        value: license.url
      };

      return item;
    });
  }

  getPackageBadge(cosmosPackage) {
    const isCertified = cosmosPackage.isCertified();
    const badgeCopy = isCertified ? "Certified" : "Community";
    const badgeClasses = classNames("badge badge-large badge-rounded", {
      "badge--primary": isCertified
    });

    return (
      <span className="column-3 badge-container selected-badge">
        <span className={badgeClasses}>
          {badgeCopy}
        </span>
      </span>
    );
  }

  getInstallButtons(cosmosPackage) {
    const tooltipContent = "Loading selected version";

    if (cosmosPackage.isCLIOnly()) {
      return (
        <div>
          <p>CLI Only Package</p>
          <p>
            {"This package can only be installed using the CLI. See the "}
            <a
              href={MetadataStore.buildDocsURI(
                "/usage/managing-services/install/#installing-a-service-using-the-cli"
              )}
              target="_blank"
            >
              documentation
            </a>.
          </p>
        </div>
      );
    }

    const { isLoadingSelectedVersion } = this.state;

    return (
      <div className="button-collection">
        <Tooltip
          wrapperClassName="button-group"
          wrapText={true}
          content={tooltipContent}
          suppress={!isLoadingSelectedVersion}
          width={200}
        >
          <button
            disabled={isLoadingSelectedVersion}
            className="button button-primary"
            onClick={this.handleReviewAndRunClick}
          >
            Review & Run
          </button>
        </Tooltip>
      </div>
    );
  }

  getTermsConditionUrl() {
    const cosmosPackage = CosmosPackagesStore.getPackageDetails();

    if (cosmosPackage.isCertified()) {
      return "https://mesosphere.com/catalog-terms-conditions/#certified-services";
    } else {
      return "https://mesosphere.com/catalog-terms-conditions/#community-services";
    }
  }

  getPackageVersionsDropdown() {
    const cosmosPackage = CosmosPackagesStore.getPackageDetails();
    const packageName = cosmosPackage.getName();
    const packageVersions = CosmosPackagesStore.getPackageVersions(packageName);

    if (packageVersions == null) {
      return null;
    }

    const selectedVersion = cosmosPackage.getVersion();
    const availableVersions = packageVersions.getVersions().map(version => {
      return {
        html: version,
        id: version
      };
    });

    if (availableVersions.length === 0) {
      return null;
    }

    return (
      <Dropdown
        buttonClassName="button button-link dropdown-toggle"
        dropdownMenuClassName="dropdown-menu"
        dropdownMenuListClassName="dropdown-menu-list"
        onItemSelection={this.handlePackageVersionChange}
        items={availableVersions}
        persistentID={selectedVersion}
        transition={true}
        wrapperClassName="dropdown"
      />
    );
  }

  getPackageDescription(definition, cosmosPackage) {
    return (
      <div className="pod flush-horizontal flush-bottom">
        {this.getItems(definition, this.getItem)}
        <ImageViewer images={cosmosPackage.getScreenshots()} />
      </div>
    );
  }

  onInstalledSuccessModalClose() {
    const query = Object.assign({}, this.props.location.query);
    delete query.appId;

    global.location.replace(
      `#${this.props.location.pathname}?${qs.stringify(query)}`
    );
  }

  getInstalledSuccessModal(name) {
    const { location } = this.props;

    return (
      <Modal
        modalClass={"modal modal-small"}
        open={!!location.query.appId}
        onClose={this.onInstalledSuccessModalClose}
      >
        <div className="modal-install-package-tab-form-wrapper">
          <div className="modal-body">
            <div className="horizontal-center">
              <span className="text-success">
                <Icon id="circle-check" size="large" color="green" />
              </span>
              <h2 className="short-top short-bottom">Success!</h2>
              <div className="install-package-modal-package-notes text-overflow-break-word">
                {`${StringUtil.capitalize(name)} is being installed.`}
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <div className="button-collection button-collection-stacked horizontal-center">
              <a
                className="button button-success button-block"
                href={`#/services/detail/${encodeURIComponent(location.query.appId)}`}
              >
                Open Service
              </a>
            </div>
          </div>
        </div>
      </Modal>
    );
  }

  render() {
    const { props, state } = this;

    if (state.hasError || !props.params.packageName) {
      return this.getErrorScreen();
    }

    const cosmosPackage = CosmosPackagesStore.getPackageDetails();
    if (!cosmosPackage) {
      return this.getLoadingScreen();
    }

    const name = cosmosPackage.getName();
    const description = cosmosPackage.getDescription();
    const preInstallNotes = cosmosPackage.getPreInstallNotes();

    let preInstallNotesParsed = null;
    if (preInstallNotes) {
      preInstallNotesParsed = StringUtil.parseMarkdown(preInstallNotes);
      preInstallNotesParsed.__html =
        "<strong>Preinstall Notes: </strong>" + preInstallNotesParsed.__html;
    }

    const definition = [
      {
        label: "Description",
        value: description &&
          <div
            dangerouslySetInnerHTML={StringUtil.parseMarkdown(description)}
          />
      },
      {
        label: " ",
        value: preInstallNotes &&
          <div
            className="pre-install-notes flush-bottom message message-warning"
            dangerouslySetInnerHTML={preInstallNotesParsed}
          />
      },
      {
        label: "Information",
        type: "subItems",
        value: [
          { label: "SCM", value: cosmosPackage.getSCM() },
          { label: "Maintainer", value: cosmosPackage.getMaintainer() }
        ]
      },
      {
        label: "Licenses",
        type: "subItems",
        value: this.mapLicenses(cosmosPackage.getLicenses())
      }
    ];

    return (
      <Page>
        <Page.Header
          breadcrumbs={
            <PackageDetailBreadcrumbs cosmosPackage={cosmosPackage} />
          }
        />
        <div className="container">
          <div className="media-object-spacing-wrapper media-object-spacing-wide media-object-offset">
            <div className="media-object media-object-align-top media-object-wrap">
              <div className="media-object-item">
                <div className="icon icon-huge icon-image-container icon-app-container icon-app-container--borderless icon-default-white">
                  <Image
                    fallbackSrc={defaultServiceImage}
                    src={cosmosPackage.getIcons()["icon-large"]}
                  />
                </div>
              </div>
              <div className="media-object-item media-object-item-grow">
                <div className="flex flex-direction-left-to-right">
                  <h1 className="short flush-top">
                    {name}
                  </h1>
                  {this.getPackageVersionsDropdown()}
                </div>
                <div className="row">
                  {this.getPackageBadge(cosmosPackage)}
                </div>
              </div>
              <div className="media-object-item package-action-buttons">
                {this.getInstallButtons(cosmosPackage)}
                <small>
                  By deploying you agree to the {" "}
                  <a
                    href={this.getTermsConditionUrl()}
                    target="_blank"
                    title="Terms and Conditions"
                  >
                    terms and conditions
                  </a>
                </small>
              </div>
            </div>
          </div>
          {state.isLoadingSelectedVersion
            ? this.getLoadingScreen()
            : this.getPackageDescription(definition, cosmosPackage)}
        </div>
        {this.getInstalledSuccessModal(name)}
      </Page>
    );
  }
}

PackageDetailTab.contextTypes = {
  router: routerShape
};

module.exports = PackageDetailTab;
